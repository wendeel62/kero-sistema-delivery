import { useState, useEffect, useRef, useCallback } from 'react'
import {
  connectPrinter,
  disconnectPrinter as disconnectQz,
  getAvailablePrinters,
  printBytes,
  encodeOrderToBytes,
  isConnected as checkConnection,
} from '../services/printService'
import type { OrderData } from '../services/printService'
import { detectQzTray } from '../lib/qz-detect'
import type { QzDetectStatus } from '../lib/qz-detect'
import WebUSBReceiptPrinter from '@point-of-sale/webusb-receipt-printer'
import type { PrinterDeviceInfo, PrinterIdentity } from '@point-of-sale/webusb-receipt-printer'
import { useToast } from '../contexts/ToastContext'

const STORAGE_KEY_PRINTER = 'kero_printer_name'
const STORAGE_KEY_AUTO = 'kero_auto_print'
const STORAGE_KEY_WIDTH = 'kero_paper_width'
const STORAGE_KEY_USB_IDENTITY = 'kero_usb_printer_identity'

const DEFAULT_PAPER_WIDTH = '80mm' as const
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 2000

export type FallbackStatus = 'disponivel' | 'conectada' | 'desconectada' | 'conectando' | 'erro'
export type UsePrinterReturn = ReturnType<typeof usePrinter>

export function usePrinter() {
  const toast = useToast()

  // ---- QZ Tray state -------------------------------------------------------
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [printers, setPrinters] = useState<string[]>([])
  const [selectedPrinter, setSelectedPrinterState] = useState<string | null>(null)
  const [autoPrint, setAutoPrintState] = useState(false)
  const [paperWidth, setPaperWidthState] = useState<'80mm' | '58mm'>(DEFAULT_PAPER_WIDTH)
  const [error, setError] = useState<string | null>(null)

  // ---- QZ Tray detection state ---------------------------------------------
  const [qzDetectStatus, setQzDetectStatus] = useState<QzDetectStatus | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)

  // ---- WebUSB fallback state ------------------------------------------------
  const [fallbackStatus, setFallbackStatus] = useState<FallbackStatus>('disponivel')
  const [fallbackActive, setFallbackActive] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<PrinterDeviceInfo | null>(null)
  const webusbRef = useRef<WebUSBReceiptPrinter | null>(null)

  const isUsbSupported =
    typeof navigator !== 'undefined' &&
    'usb' in navigator &&
    typeof navigator.usb.requestDevice === 'function'

  // ---- QZ Tray: connect on mount -------------------------------------------

  useEffect(() => {
    const savedPrinter = localStorage.getItem(STORAGE_KEY_PRINTER)
    if (savedPrinter) setSelectedPrinterState(savedPrinter)

    const savedAuto = localStorage.getItem(STORAGE_KEY_AUTO)
    if (savedAuto !== null) setAutoPrintState(savedAuto === 'true')

    const savedWidth = localStorage.getItem(STORAGE_KEY_WIDTH)
    if (savedWidth === '58mm' || savedWidth === '80mm') setPaperWidthState(savedWidth)
    else setPaperWidthState(DEFAULT_PAPER_WIDTH)

    setIsDetecting(true)
    connectPrinter()
      .then(async () => {
        setIsConnected(true)
        try {
          const list = await getAvailablePrinters()
          setPrinters(list)
          if (list.length === 0) {
            console.warn('[KeroPrint] QZ Tray conectado mas nenhuma impressora encontrada')
          }
        } catch (loadErr) {
          console.error('[KeroPrint] Falha ao carregar lista de impressoras:', loadErr)
          setPrinters([])
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'QZ Tray não encontrado'
        setError(msg)
      })
      .finally(() => setIsDetecting(false))
  }, [])

  // ---- QZ Tray: health check every 15s --------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      const active = checkConnection()
      setIsConnected(active)
    }, 15_000)
    return () => clearInterval(interval)
  }, [])

  // ---- WebUSB: auto-reconnect on mount -------------------------------------

  useEffect(() => {
    if (!isUsbSupported) return

    const savedRaw = localStorage.getItem(STORAGE_KEY_USB_IDENTITY)
    if (!savedRaw) return

    let identity: PrinterIdentity
    try {
      identity = JSON.parse(savedRaw)
    } catch {
      localStorage.removeItem(STORAGE_KEY_USB_IDENTITY)
      return
    }

    let cancelled = false

    const tryReconnect = async () => {
      try {
        const instance = new WebUSBReceiptPrinter()

        instance.addEventListener('connected', (evt: { detail?: PrinterDeviceInfo }) => {
          if (cancelled) return
          webusbRef.current = instance
          setFallbackStatus('conectada')
          setDeviceInfo(evt.detail ?? null)
        })

        instance.addEventListener('disconnected', () => {
          if (cancelled) return
          webusbRef.current = null
          setFallbackStatus('desconectada')
          setDeviceInfo(null)
        })

        await instance.reconnect(identity)
      } catch {
        if (!cancelled) {
          setFallbackStatus('disponivel')
        }
      }
    }

    tryReconnect()

    return () => {
      cancelled = true
    }
  }, [isUsbSupported])

  // ---- WebUSB: cleanup on unmount -------------------------------------------

  useEffect(() => {
    return () => {
      if (webusbRef.current) {
        webusbRef.current.disconnect().catch(() => {})
      }
    }
  }, [])

  // ---- QZ Tray: connect / disconnect / load / select ------------------------

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      await connectPrinter()
      setIsConnected(true)
      const list = await getAvailablePrinters()
      setPrinters(list)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao conectar com QZ Tray'
      setError(message)
      setIsConnected(false)
    }
    setIsConnecting(false)
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await disconnectQz()
    } catch {
      // ignore
    }
    setIsConnected(false)
  }, [])

  const loadPrinters = useCallback(async () => {
    try {
      const list = await getAvailablePrinters()
      setPrinters(list)
    } catch {
      setPrinters([])
    }
  }, [])

  const selectPrinter = useCallback((name: string) => {
    setSelectedPrinterState(name)
    localStorage.setItem(STORAGE_KEY_PRINTER, name)
  }, [])

  // ---- QZ Tray: detection (independent of connection) ----------------------

  const detectQz = useCallback(async () => {
    setIsDetecting(true)
    setError(null)
    try {
      const result = await detectQzTray()
      setQzDetectStatus(result)
      return result
    } catch {
      setQzDetectStatus({ status: 'nao_executando' })
      return { status: 'nao_executando' } as QzDetectStatus
    } finally {
      setIsDetecting(false)
    }
  }, [])

  // ---- WebUSB: connect fallback (manual, user gesture) --------------------

  const connectFallback = useCallback(async () => {
    if (!isUsbSupported) {
      toast.error('WebUSB não suportado neste navegador. Use Chrome ou Edge.')
      return
    }

    setFallbackActive(false)

    try {
      setFallbackStatus('conectando')

      if (webusbRef.current) {
        try { await webusbRef.current.disconnect() } catch { /* ignore */ }
        webusbRef.current = null
      }

      const instance = new WebUSBReceiptPrinter()

      instance.addEventListener('connected', (evt: { detail?: PrinterDeviceInfo }) => {
        const info = evt.detail as PrinterDeviceInfo | undefined
        webusbRef.current = instance
        setFallbackStatus('conectada')
        setDeviceInfo(info ?? null)

        if (info) {
          const identity: PrinterIdentity = {
            vendorId: info.vendorId,
            productId: info.productId,
            serialNumber: info.serialNumber,
          }
          localStorage.setItem(STORAGE_KEY_USB_IDENTITY, JSON.stringify(identity))
          toast.success(`Fallback USB conectado: ${info.manufacturerName} ${info.productName}`)
        }
      })

      instance.addEventListener('disconnected', () => {
        webusbRef.current = null
        setFallbackStatus('desconectada')
        setDeviceInfo(null)
        toast.warning('Impressora USB de fallback desconectada')
      })

      await instance.connect()
      setFallbackStatus(prev => (prev === 'conectando' ? 'conectada' : prev))
    } catch (error: unknown) {
      webusbRef.current = null
      setFallbackStatus('erro')
      const msg = (error as { message?: string })?.message || String(error)
      if (msg.includes('No device selected') || msg.includes('user denied')) {
        toast.error('Seleção de impressora USB cancelada')
      } else {
        toast.error('Falha ao conectar impressora USB de fallback')
      }
    }
  }, [isUsbSupported, toast])

  // ---- WebUSB: disconnect fallback -----------------------------------------

  const disconnectFallback = useCallback(async () => {
    setFallbackActive(false)
    try {
      if (webusbRef.current) {
        await webusbRef.current.disconnect()
      }
    } catch { /* ignore */ }
    webusbRef.current = null
    setFallbackStatus('disponivel')
    setDeviceInfo(null)
    localStorage.removeItem(STORAGE_KEY_USB_IDENTITY)
  }, [])

  // ---- Print: QZ Tray primary → WebUSB fallback --------------------------

  const print = useCallback(
    async (order: OrderData) => {
      const targetPrinter = selectedPrinter
      if (!targetPrinter) {
        setError('Nenhuma impressora selecionada')
        return
      }

      setError(null)

      // 1. Generate bytes
      const bytes = encodeOrderToBytes(order, paperWidth)

      // 2. Try QZ Tray (primary)
      let qzFailed = false
      try {
        await printBytes(targetPrinter, bytes)
        setFallbackActive(false)
        return
      } catch (err) {
        qzFailed = true
        const message = err instanceof Error ? err.message : 'Falha ao imprimir no QZ Tray'
        console.warn('[KeroPrint] QZ Tray falhou, tentando fallback USB:', message)
        if (!checkConnection()) setIsConnected(false)
      }

      // 3. Try WebUSB (fallback)
      if (qzFailed) {
        const usbDevice = webusbRef.current
        if (!usbDevice || fallbackStatus !== 'conectada') {
          setError('QZ Tray indisponível e nenhuma impressora USB de fallback conectada')
          return
        }

        try {
          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              await usbDevice.print(bytes)
              setFallbackActive(true)
              return
            } catch (usbErr) {
              console.warn(`[KeroPrint] Fallback USB tentativa ${attempt}/${MAX_RETRIES} falhou:`, usbErr)
              if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
              } else {
                throw usbErr
              }
            }
          }
        } catch (usbErr) {
          const message = usbErr instanceof Error ? usbErr.message : 'Falha ao imprimir via fallback USB'
          setError(`QZ Tray e fallback USB falharam: ${message}`)
        }
      }
    },
    [selectedPrinter, paperWidth, fallbackStatus],
  )

  // ---- Settings -------------------------------------------------------------

  const setAutoPrint = useCallback((value: boolean) => {
    setAutoPrintState(value)
    localStorage.setItem(STORAGE_KEY_AUTO, String(value))
  }, [])

  const setPaperWidth = useCallback((value: '80mm' | '58mm') => {
    setPaperWidthState(value)
    localStorage.setItem(STORAGE_KEY_WIDTH, value)
  }, [])

  // ---- Return --------------------------------------------------------------

  return {
    isConnected,
    isConnecting,
    printers,
    selectedPrinter,
    autoPrint,
    paperWidth,
    error,
    fallbackStatus,
    fallbackActive,
    deviceInfo,
    connect,
    disconnect,
    loadPrinters,
    selectPrinter,
    print,
    setAutoPrint,
    setPaperWidth,
    connectFallback,
    disconnectFallback,
    qzDetectStatus,
    isDetecting,
    detectQz,
  } as const
}
