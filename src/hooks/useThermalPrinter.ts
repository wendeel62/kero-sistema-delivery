import { useState, useEffect, useRef, useCallback } from 'react'
import WebUSBReceiptPrinter from '@point-of-sale/webusb-receipt-printer'
import type { PrinterDeviceInfo, PrinterIdentity } from '@point-of-sale/webusb-receipt-printer'
import { buildReceipt } from '../lib/printReceipt'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { UnifiedPedido, Configuracoes } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrinterStatus = 'conectada' | 'desconectada' | 'imprimindo' | 'erro' | 'conectando'

/** A print job waiting in the queue. */
interface PrintJob {
  id: string
  pedido: UnifiedPedido
  configData: Configuracoes
  retries: number
  resolve: () => void
  reject: (reason: unknown) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const PRINT_TIMEOUT_MS = 15_000
const STORAGE_KEY_PREFIX = 'kero_printer_'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useThermalPrinter() {
  const { user } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState<PrinterStatus>('desconectada')
  const [deviceInfo, setDeviceInfo] = useState<PrinterDeviceInfo | null>(null)

  // Stable ref for the printer instance — survives re-renders
  const printerRef = useRef<WebUSBReceiptPrinter | null>(null)
  const tenantId = user?.user_metadata?.tenant_id as string

  // ---- Print queue (serialized, fire-and-forget) -------------------------

  const queueRef = useRef<PrintJob[]>([])
  const processingRef = useRef(false)

  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true

    while (queueRef.current.length > 0) {
      const job = queueRef.current[0]

      try {
        setStatus('imprimindo')
        await executePrint(job.pedido, job.configData)
        job.resolve()
      } catch (error) {
        if (job.retries < MAX_RETRIES) {
          console.warn(
            `[KeroPrint] Job ${job.id} falhou (tentativa ${job.retries + 1}/${MAX_RETRIES}), tentando novamente...`,
            error
          )
          job.retries++
          queueRef.current.shift()
          queueRef.current.push(job) // re-enqueue at the end
          await sleep(RETRY_DELAY_MS)
          continue
        }

        console.error(`[KeroPrint] Job ${job.id} excedeu retries máximas:`, error)
        job.reject(error)
        toast.error('Falha na impressão após 3 tentativas — verifique a impressora')
      }

      // Remove completed or permanently-failed job
      queueRef.current.shift()
    }

    processingRef.current = false
    // Only revert to 'conectada' if we're still the active state
    setStatus(prev => (prev === 'imprimindo' ? 'conectada' : prev))
  }, [toast])

  const enqueue = useCallback(
    (pedido: UnifiedPedido, configData: Configuracoes): Promise<void> => {
      return new Promise((resolve, reject) => {
        const job: PrintJob = {
          id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          pedido,
          configData,
          retries: 0,
          resolve,
          reject,
        }
        queueRef.current.push(job)
        processQueue()
      })
    },
    [processQueue]
  )

  // ---- Core print execution -----------------------------------------------

  const executePrint = async (pedido: UnifiedPedido, configData: Configuracoes): Promise<void> => {
    const printer = printerRef.current
    if (!printer) throw new Error('[KeroPrint] Impressora não inicializada')

    const larguraPapel = (configData.largura_papel ?? 80) as 58 | 80

    const receiptData = buildReceipt(pedido, configData, larguraPapel)
    if (!receiptData) throw new Error('[KeroPrint] Falha ao gerar dados do cupom')

    // Race between print and timeout
    await withTimeout(printer.print(receiptData), PRINT_TIMEOUT_MS, 'Timeout ao imprimir — impressora não respondeu')
  }

  // ---- Configuration query ------------------------------------------------

  const { data: config } = useQuery({
    queryKey: ['configuracoes', tenantId],
    queryFn: async () => {
      if (!tenantId) return null
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()
      if (error) throw error
      return data as Configuracoes
    },
    enabled: !!tenantId,
  })

  const isAutoEnabled = config?.impressao_automatica ?? false
  const larguraPapel = (config?.largura_papel ?? 80) as 58 | 80

  // ---- Browser WebUSB support ---------------------------------------------

  const isSupported =
    typeof navigator !== 'undefined' &&
    'usb' in navigator &&
    typeof navigator.usb.requestDevice === 'function'

  // ---- Auto-reconnect on mount --------------------------------------------

  useEffect(() => {
    if (!tenantId || !isSupported) return

    const storageKey = `${STORAGE_KEY_PREFIX}${tenantId}`
    const savedRaw = localStorage.getItem(storageKey)
    if (!savedRaw) return

    let identity: PrinterIdentity
    try {
      identity = JSON.parse(savedRaw)
    } catch {
      localStorage.removeItem(storageKey)
      return
    }

    // Attempt silent reconnect (no user gesture required if device was
    // previously authorized).  This must happen after a user interaction
    // in some browsers — we try anyway and gracefully handle failure.
    let cancelled = false

    const tryReconnect = async () => {
      try {
        const instance = new WebUSBReceiptPrinter()

        instance.addEventListener('connected', (evt: any) => {
          if (cancelled) return
          printerRef.current = instance
          setStatus('conectada')
          setDeviceInfo(evt.detail ?? null)
        })

        instance.addEventListener('disconnected', () => {
          if (cancelled) return
          printerRef.current = null
          setStatus('desconectada')
          setDeviceInfo(null)
        })

        await instance.reconnect(identity)
      } catch (err) {
        // Silent — reconnect failure is expected when no device is available
        // or the page hasn't received a user gesture yet.
        if (!cancelled) {
          setStatus('desconectada')
        }
      }
    }

    tryReconnect()

    return () => {
      cancelled = true
    }
  }, [tenantId, isSupported])

  // ---- Cleanup on unmount -------------------------------------------------

  useEffect(() => {
    return () => {
      // Best-effort disconnect; don't await
      if (printerRef.current) {
        printerRef.current.disconnect().catch(() => {})
      }
    }
  }, [])

  // ---- Public API: connect ------------------------------------------------

  const connect = useCallback(async () => {
    if (!isSupported) {
      toast.error('WebUSB não suportado neste navegador. Use Chrome ou Edge.')
      return
    }

    try {
      setStatus('conectando')

      // Disconnect previous instance if any
      if (printerRef.current) {
        try { await printerRef.current.disconnect() } catch { /* ignore */ }
        printerRef.current = null
      }

      const instance = new WebUSBReceiptPrinter()

      // Wire up events BEFORE connect so we don't miss the 'connected' event
      instance.addEventListener('connected', (evt: any) => {
        const info = evt.detail as PrinterDeviceInfo | undefined
        printerRef.current = instance
        setStatus('conectada')
        setDeviceInfo(info ?? null)

        if (info) {
          // Persist identity for future auto-reconnect
          const storageKey = `${STORAGE_KEY_PREFIX}${tenantId}`
          const identity: PrinterIdentity = {
            vendorId: info.vendorId,
            productId: info.productId,
            serialNumber: info.serialNumber,
          }
          localStorage.setItem(storageKey, JSON.stringify(identity))

          toast.success(
            `Impressora conectada: ${info.manufacturerName} ${info.productName}`
          )
        }
      })

      instance.addEventListener('disconnected', () => {
        printerRef.current = null
        setStatus('desconectada')
        setDeviceInfo(null)
        toast.warning('Impressora desconectada')
      })

      // This triggers the browser's USB device picker dialog
      await instance.connect()

      // If connect() resolved without throwing but the 'connected' event
      // hasn't fired yet (edge case), set a fallback status
      setStatus(prev => (prev === 'conectando' ? 'conectada' : prev))

    } catch (error: any) {
      printerRef.current = null
      setStatus('erro')

      // Provide user-friendly messages for common failure modes
      const msg = error?.message || String(error)

      if (msg.includes('No device selected') || msg.includes('user denied')) {
        toast.error('Seleção de impressora cancelada pelo usuário')
      } else if (msg.includes('Could not connect')) {
        toast.error('Não foi possível conectar — verifique se a impressora está ligada e conectada via USB')
      } else if (msg.includes('requestDevice')) {
        toast.error('Permissão USB negada pelo navegador. Recarregue a página e tente novamente.')
      } else {
        console.error('[KeroPrint] Falha ao conectar impressora:', error)
        toast.error('Falha ao conectar impressora — tente novamente')
      }
    }
  }, [isSupported, tenantId, toast])

  // ---- Public API: disconnect ---------------------------------------------

  const disconnect = useCallback(async () => {
    try {
      if (printerRef.current) {
        await printerRef.current.disconnect()
      }
    } catch (error) {
      console.warn('[KeroPrint] Erro ao desconectar (ignorado):', error)
    }

    printerRef.current = null
    setStatus('desconectada')
    setDeviceInfo(null)

    // Remove persisted identity
    if (tenantId) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tenantId}`)
    }
  }, [tenantId])

  // ---- Public API: print (enqueued) ---------------------------------------

  const print = useCallback(
    (pedido: UnifiedPedido, configData: Configuracoes): void => {
      // Fire-and-forget: enqueue and swallow unhandled rejections
      enqueue(pedido, configData).catch(err => {
        // Already handled inside processQueue with toast
        console.error('[KeroPrint] Job rejeitado:', err)
      })
    },
    [enqueue]
  )

  // ---- Return stable API --------------------------------------------------

  return {
    /** Current connection status. */
    status,
    /** Whether the browser supports WebUSB. */
    isSupported,
    /** Whether auto-print on new order is enabled in settings. */
    isAutoEnabled,
    /** Configured paper width (58mm or 80mm). */
    larguraPapel,
    /** Info about the connected device (null if disconnected). */
    deviceInfo,
    /** Prompt user to select a USB printer. Requires user gesture. */
    connect,
    /** Disconnect current printer and clear saved identity. */
    disconnect,
    /** Enqueue a receipt for printing. Fire-and-forget with retry. */
    print,
  } as const
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) }
    )
  })
}
