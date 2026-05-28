import { useState, useEffect, useRef, useCallback } from 'react'
import { buildReceipt } from '../lib/printReceipt'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { UnifiedPedido, Configuracoes } from '../types'

const HELPER_URL = 'http://localhost:3002'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const PRINT_TIMEOUT_MS = 15_000
const STORAGE_KEY_PREFIX = 'kero_desktop_printer_'

export type DesktopPrinterStatus = 'checking' | 'available' | 'unavailable' | 'conectada' | 'desconectada' | 'imprimindo' | 'erro'

interface PrintJob {
  id: string
  pedido: UnifiedPedido
  configData: Configuracoes
  retries: number
  resolve: () => void
  reject: (reason: unknown) => void
}

export function useDesktopPrinter() {
  const { user } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState<DesktopPrinterStatus>('checking')
  const [printers, setPrinters] = useState<string[]>([])
  const [selectedPrinter, setSelectedPrinterState] = useState<string | null>(null)

  const queueRef = useRef<PrintJob[]>([])
  const processingRef = useRef(false)
  const tenantId = user?.user_metadata?.tenant_id as string

  const storageKey = `${STORAGE_KEY_PREFIX}${tenantId}`

  // ---- Load saved printer on mount ------------------------------------------

  useEffect(() => {
    if (tenantId) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setSelectedPrinterState(saved)
      }
    }
  }, [tenantId, storageKey])

  // ---- Helper detection ----------------------------------------------------

  const checkHelper = useCallback(async (): Promise<boolean> => {
    try {
      setStatus('checking')
      const res = await fetch(`${HELPER_URL}/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        setStatus(selectedPrinter ? 'conectada' : 'available')
        return true
      }
      setStatus('unavailable')
      return false
    } catch {
      setStatus('unavailable')
      return false
    }
  }, [selectedPrinter])

  useEffect(() => {
    checkHelper()
    const interval = setInterval(checkHelper, 30_000)
    return () => clearInterval(interval)
  }, [checkHelper])

  // ---- List printers -------------------------------------------------------

  const listPrinters = useCallback(async (): Promise<string[]> => {
    try {
      const res = await fetch(`${HELPER_URL}/api/printers`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) {
        setPrinters([])
        return []
      }
      const data = await res.json()
      const list: string[] = data.printers ?? data ?? []
      setPrinters(list)
      return list
    } catch {
      setPrinters([])
      return []
    }
  }, [])

  // ---- Select printer ------------------------------------------------------

  const selectPrinter = useCallback((name: string) => {
    setSelectedPrinterState(name)
    localStorage.setItem(storageKey, name)
    setStatus('conectada')
  }, [storageKey])

  const disconnectPrinter = useCallback(() => {
    setSelectedPrinterState(null)
    localStorage.removeItem(storageKey)
    setStatus('available')
  }, [storageKey])

  // ---- Configuration query -------------------------------------------------

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

  // ---- Print queue (serialized) --------------------------------------------

  const executePrint = useCallback(async (pedido: UnifiedPedido, configData: Configuracoes): Promise<void> => {
    const printerName = selectedPrinter ?? localStorage.getItem(storageKey)
    if (!printerName) throw new Error('[KeroPrint] Nenhuma impressora selecionada')

    const larguraPapel = (configData.largura_papel ?? 80) as 58 | 80
    const receiptData = buildReceipt(pedido, configData, larguraPapel)
    if (!receiptData) throw new Error('[KeroPrint] Falha ao gerar dados do cupom')

    const base64 = btoa(String.fromCharCode(...new Uint8Array(receiptData)))

    await withTimeout(
      fetch(`${HELPER_URL}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer: printerName, data: base64 }),
        signal: AbortSignal.timeout(PRINT_TIMEOUT_MS),
      }),
      PRINT_TIMEOUT_MS,
      'Timeout ao imprimir — impressora não respondeu'
    )
  }, [selectedPrinter, storageKey])

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
    setStatus(prev => (prev === 'imprimindo' ? (selectedPrinter ? 'conectada' : 'available') : prev))
  }, [toast, selectedPrinter, executePrint])

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

  const print = useCallback(
    (pedido: UnifiedPedido, configData: Configuracoes): void => {
      enqueue(pedido, configData).catch(err => {
        console.error('[KeroPrint] Job rejeitado:', err)
      })
    },
    [enqueue]
  )

  return {
    status,
    printers,
    selectedPrinter,
    config: config ?? null,
    isAutoEnabled,
    isSupported: true,
    checkHelper,
    listPrinters,
    selectPrinter,
    disconnectPrinter,
    print,
  } as const
}

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
