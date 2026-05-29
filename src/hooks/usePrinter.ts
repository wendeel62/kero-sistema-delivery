import { useState, useEffect, useCallback } from 'react'
import {
  connectPrinter,
  disconnectPrinter,
  getAvailablePrinters,
  printReceipt,
  buildOrderReceipt,
} from '../services/printService'
import type { OrderData } from '../services/printService'

const STORAGE_KEY_PRINTER = 'kero_printer_name'
const STORAGE_KEY_AUTO = 'kero_auto_print'
const STORAGE_KEY_WIDTH = 'kero_paper_width'

const DEFAULT_PAPER_WIDTH = '80mm' as const

export function usePrinter() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [printers, setPrinters] = useState<string[]>([])
  const [selectedPrinter, setSelectedPrinterState] = useState<string | null>(null)
  const [autoPrint, setAutoPrintState] = useState(false)
  const [paperWidth, setPaperWidthState] = useState<'80mm' | '58mm'>(DEFAULT_PAPER_WIDTH)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedPrinter = localStorage.getItem(STORAGE_KEY_PRINTER)
    if (savedPrinter) setSelectedPrinterState(savedPrinter)

    const savedAuto = localStorage.getItem(STORAGE_KEY_AUTO)
    if (savedAuto !== null) setAutoPrintState(savedAuto === 'true')

    const savedWidth = localStorage.getItem(STORAGE_KEY_WIDTH)
    if (savedWidth === '58mm' || savedWidth === '80mm') setPaperWidthState(savedWidth)
    else setPaperWidthState(DEFAULT_PAPER_WIDTH)

    connectPrinter()
      .then(() => setIsConnected(true))
      .catch(() => { /* silent */ })
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      await connectPrinter()
      setIsConnected(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao conectar com QZ Tray'
      setError(message)
      setIsConnected(false)
    }
    setIsConnecting(false)
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await disconnectPrinter()
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

  const print = useCallback(
    async (order: OrderData) => {
      if (!selectedPrinter) {
        setError('Nenhuma impressora selecionada')
        return
      }
      setError(null)
      try {
        const lines = buildOrderReceipt(order)
        await printReceipt(selectedPrinter, lines, paperWidth)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao imprimir'
        setError(message)
      }
    },
    [selectedPrinter, paperWidth],
  )

  const setAutoPrint = useCallback((value: boolean) => {
    setAutoPrintState(value)
    localStorage.setItem(STORAGE_KEY_AUTO, String(value))
  }, [])

  const setPaperWidth = useCallback((value: '80mm' | '58mm') => {
    setPaperWidthState(value)
    localStorage.setItem(STORAGE_KEY_WIDTH, value)
  }, [])

  return {
    isConnected,
    isConnecting,
    printers,
    selectedPrinter,
    autoPrint,
    paperWidth,
    error,
    connect,
    disconnect,
    loadPrinters,
    selectPrinter,
    print,
    setAutoPrint,
    setPaperWidth,
  } as const
}
