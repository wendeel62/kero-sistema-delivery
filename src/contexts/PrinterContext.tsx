import { createContext, useContext, type ReactNode } from 'react'
import { usePrinter as usePrinterRaw, type UsePrinterReturn } from '../hooks/usePrinter'

type PrinterContextValue = UsePrinterReturn

const PrinterContext = createContext<PrinterContextValue | null>(null)

export function PrinterProvider({ children }: { children: ReactNode }) {
  const printer = usePrinterRaw()
  return (
    <PrinterContext.Provider value={printer}>
      {children}
    </PrinterContext.Provider>
  )
}

export function usePrinterContext(): PrinterContextValue {
  const ctx = useContext(PrinterContext)
  if (!ctx) {
    throw new Error('usePrinterContext must be used inside <PrinterProvider>')
  }
  return ctx
}

export function usePrinter(): PrinterContextValue {
  return usePrinterContext()
}