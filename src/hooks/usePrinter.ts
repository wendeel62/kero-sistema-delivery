import { useState, useEffect, useRef, useCallback } from 'react'
import WebUSBReceiptPrinter from '@point-of-sale/webusb-receipt-printer'
import type { PrinterDeviceInfo, PrinterIdentity } from '@point-of-sale/webusb-receipt-printer'
import { buildReceipt } from '../lib/printReceipt'
import { encodeBase64 } from '../lib/base64'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { UnifiedPedido, Configuracoes } from '../types'

export type PrinterStatus = 'checking' | 'available' | 'unavailable' | 'conectada' | 'desconectada' | 'imprimindo' | 'erro' | 'conectando'
export type PrinterTechnology = 'webusb' | 'desktop' | null

interface PrintJob {
  id: string
  pedido: UnifiedPedido
  configData: Configuracoes
  retries: number
  resolve: () => void
  reject: (reason: unknown) => void
}

const HELPER_URL = 'http://localhost:3002'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const PRINT_TIMEOUT_MS = 15_000
const STORAGE_KEY_WEBSUSB = 'kero_printer_'
const STORAGE_KEY_DESKTOP = 'kero_desktop_printer_'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) }
    )
  })
}

export function usePrinter() {
  const { user } = useAuth()
  const toast = useToast()
  const tenantId = user?.user_metadata?.tenant_id as string

  // --- State ---
  const [technology, setTechnology] = useState<PrinterTechnology>(null)
  const [status, setStatus] = useState<PrinterStatus>('checking')
  const [printerName, setPrinterName] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<PrinterDeviceInfo | null>(null)
  const [printers, setPrinters] = useState<string[]>([])

  // --- Refs ---
  const printerRef = useRef<WebUSBReceiptPrinter | null>(null)
  const queueRef = useRef<PrintJob[]>([])
  const processingRef = useRef(false)

  // --- Single config query ---
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
    staleTime: 60_000,
  })

  const isAutoEnabled = config?.impressao_automatica ?? false
  const larguraPapel = (config?.largura_papel ?? 80) as 58 | 80

  const isWebUSBSupported =
    typeof navigator !== 'undefined' &&
    'usb' in navigator &&
    typeof navigator.usb.requestDevice === 'function'

  // --------------- Helper detection (Desktop) ---------------

  const checkHelper = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${HELPER_URL}/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        setTechnology('desktop')
        setStatus(printerName ? 'conectada' : 'available')
        return true
      }
      // If desktop unavailable, try WebUSB auto-reconnect
      if (isWebUSBSupported && printerName) {
        setTechnology(null)
        setStatus('desconectada')
      } else {
        setStatus('unavailable')
      }
      return false
    } catch {
      if (isWebUSBSupported && printerName) {
        setTechnology(null)
        setStatus('desconectada')
      } else {
        setStatus('unavailable')
      }
      return false
    }
  }, [printerName, isWebUSBSupported])

  // --- Periodic health check for desktop helper ---
  useEffect(() => {
    checkHelper()
    const interval = setInterval(checkHelper, 30_000)
    return () => clearInterval(interval)
  }, [checkHelper])

  // --------------- Load saved printer on mount ---------------

  useEffect(() => {
    if (!tenantId) return

    // Try desktop first
    const desktopSaved = localStorage.getItem(`${STORAGE_KEY_DESKTOP}${tenantId}`)
    if (desktopSaved) {
      setPrinterName(desktopSaved)
      setTechnology('desktop')
      checkHelper()
      return
    }

    // Then WebUSB
    if (!isWebUSBSupported) return
    const webusbSavedRaw = localStorage.getItem(`${STORAGE_KEY_WEBSUSB}${tenantId}`)
    if (!webusbSavedRaw) return

    let identity: PrinterIdentity
    try {
      identity = JSON.parse(webusbSavedRaw)
    } catch {
      localStorage.removeItem(`${STORAGE_KEY_WEBSUSB}${tenantId}`)
      return
    }

    let cancelled = false
    const tryReconnect = async () => {
      try {
        const instance = new WebUSBReceiptPrinter()
        instance.addEventListener('connected', (evt: { detail?: PrinterDeviceInfo }) => {
          if (cancelled) return
          printerRef.current = instance
          setTechnology('webusb')
          setStatus('conectada')
          const info = evt.detail ?? null
          setDeviceInfo(info)
          setPrinterName(info ? `${info.manufacturerName} ${info.productName}` : 'Impressora USB')
        })
        instance.addEventListener('disconnected', () => {
          if (cancelled) return
          printerRef.current = null
          setStatus('desconectada')
          setDeviceInfo(null)
        })
        await instance.reconnect(identity)
      } catch {
        if (!cancelled) setStatus('desconectada')
      }
    }
    tryReconnect()
    return () => { cancelled = true }
  }, [tenantId, isWebUSBSupported, checkHelper])

  // --------------- Desktop printer operations ---------------

  const listPrinters = useCallback(async (): Promise<string[]> => {
    try {
      const res = await fetch(`${HELPER_URL}/api/printers`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) { setPrinters([]); return [] }
      const data = await res.json()
      const list: string[] = data.printers ?? data ?? []
      setPrinters(list)
      return list
    } catch {
      setPrinters([])
      return []
    }
  }, [])

  const selectPrinterDesktop = useCallback((name: string) => {
    setPrinterName(name)
    setTechnology('desktop')
    setStatus('conectada')
    localStorage.setItem(`${STORAGE_KEY_DESKTOP}${tenantId}`, name)
  }, [tenantId])

  const disconnectDesktop = useCallback(() => {
    setPrinterName(null)
    setTechnology(null)
    setStatus('available')
    setDeviceInfo(null)
    localStorage.removeItem(`${STORAGE_KEY_DESKTOP}${tenantId}`)
  }, [tenantId])

  // --------------- WebUSB operations ---------------

  const connectWebUSB = useCallback(async () => {
    if (!isWebUSBSupported) {
      toast.error('WebUSB não suportado neste navegador. Use Chrome ou Edge.')
      return
    }
    try {
      setStatus('conectando')
      if (printerRef.current) {
        try { await printerRef.current.disconnect() } catch { /* ignore */ }
        printerRef.current = null
      }

      const instance = new WebUSBReceiptPrinter()

      instance.addEventListener('connected', (evt: { detail?: PrinterDeviceInfo }) => {
        const info = evt.detail as PrinterDeviceInfo | undefined
        printerRef.current = instance
        setTechnology('webusb')
        setStatus('conectada')
        setDeviceInfo(info ?? null)
        const name = info ? `${info.manufacturerName} ${info.productName}` : 'Impressora USB'
        setPrinterName(name)

        if (info) {
          const storageKey = `${STORAGE_KEY_WEBSUSB}${tenantId}`
          const identity: PrinterIdentity = {
            vendorId: info.vendorId,
            productId: info.productId,
            serialNumber: info.serialNumber,
          }
          localStorage.setItem(storageKey, JSON.stringify(identity))
          toast.success(`Impressora conectada: ${name}`)
        }
      })

      instance.addEventListener('disconnected', () => {
        printerRef.current = null
        setStatus('desconectada')
        setDeviceInfo(null)
        toast.warning('Impressora desconectada')
      })

      await instance.connect()
      setStatus(prev => (prev === 'conectando' ? 'conectada' : prev))
    } catch (error: unknown) {
      printerRef.current = null
      setStatus('erro')
      const msg = (error as { message?: string })?.message || String(error)
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
  }, [isWebUSBSupported, tenantId, toast])

  const disconnectWebUSB = useCallback(async () => {
    try {
      if (printerRef.current) await printerRef.current.disconnect()
    } catch { /* ignore */ }
    printerRef.current = null
    setTechnology(null)
    setStatus('desconectada')
    setDeviceInfo(null)
    setPrinterName(null)
    if (tenantId) localStorage.removeItem(`${STORAGE_KEY_WEBSUSB}${tenantId}`)
  }, [tenantId])

  // --------------- Unified disconnect ---------------

  const disconnect = useCallback(() => {
    if (technology === 'webusb') disconnectWebUSB()
    else disconnectDesktop()
  }, [technology, disconnectWebUSB, disconnectDesktop])

  // --------------- Print queue ---------------

  const executePrintDesktop = useCallback(async (pedido: UnifiedPedido, configData: Configuracoes) => {
    const printer = printerName ?? localStorage.getItem(`${STORAGE_KEY_DESKTOP}${tenantId}`)
    if (!printer) throw new Error('[KeroPrint] Nenhuma impressora selecionada')

    const receiptData = buildReceipt(pedido, configData, (configData.largura_papel ?? 80) as 58 | 80)
    if (!receiptData) throw new Error('[KeroPrint] Falha ao gerar dados do cupom')

    await withTimeout(
      fetch(`${HELPER_URL}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer, data: encodeBase64(receiptData) }),
        signal: AbortSignal.timeout(PRINT_TIMEOUT_MS),
      }),
      PRINT_TIMEOUT_MS,
      'Timeout ao imprimir — impressora não respondeu'
    )
  }, [printerName, tenantId])

  const executePrintWebUSB = useCallback(async (pedido: UnifiedPedido, configData: Configuracoes) => {
    const printer = printerRef.current
    if (!printer) throw new Error('[KeroPrint] Impressora não inicializada')

    const receiptData = buildReceipt(pedido, configData, (configData.largura_papel ?? 80) as 58 | 80)
    if (!receiptData) throw new Error('[KeroPrint] Falha ao gerar dados do cupom')

    await withTimeout(printer.print(receiptData), PRINT_TIMEOUT_MS, 'Timeout ao imprimir — impressora não respondeu')
  }, [])

  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true

    const execFn = technology === 'desktop' ? executePrintDesktop : executePrintWebUSB

    while (queueRef.current.length > 0) {
      const job = queueRef.current[0]
      try {
        setStatus('imprimindo')
        await execFn(job.pedido, job.configData)
        job.resolve()
      } catch (error) {
        if (job.retries < MAX_RETRIES) {
          console.warn(`[KeroPrint] Job ${job.id} falhou (tentativa ${job.retries + 1}/${MAX_RETRIES})`, error)
          job.retries++
          queueRef.current.shift()
          queueRef.current.push(job)
          await sleep(RETRY_DELAY_MS)
          continue
        }
        console.error(`[KeroPrint] Job ${job.id} excedeu retries:`, error)
        job.reject(error)
        toast.error('Falha na impressão após 3 tentativas — verifique a impressora')
      }
      queueRef.current.shift()
    }

    processingRef.current = false
    setStatus(prev => (prev === 'imprimindo' ? (printerName ? 'conectada' : 'available') : prev))
  }, [technology, executePrintDesktop, executePrintWebUSB, toast, printerName])

  const print = useCallback((pedido: UnifiedPedido, configData: Configuracoes): void => {
    new Promise<void>((resolve, reject) => {
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
    }).catch(err => console.error('[KeroPrint] Job rejeitado:', err))
  }, [processQueue])

  return {
    technology,
    status,
    printerName,
    deviceInfo,
    printers,
    config: config ?? null,
    isAutoEnabled,
    isWebUSBSupported,
    larguraPapel,
    checkHelper,
    listPrinters,
    selectPrinterDesktop,
    disconnectDesktop,
    connectWebUSB,
    disconnectWebUSB,
    disconnect,
    print,
  } as const
}
