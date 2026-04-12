import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface Toast {
  id: string
  tipo: 'success' | 'error' | 'warning' | 'info'
  mensagem: string
}

interface ToastContextType {
  toasts: Toast[]
  success: (mensagem: string) => void
  error: (mensagem: string) => void
  warning: (mensagem: string) => void
  info: (mensagem: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((tipo: Toast['tipo'], mensagem: string) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { id, tipo, mensagem }
    
    setToasts(prev => {
      let updated = [...prev]
      if (updated.length >= 3) {
        updated = updated.slice(1)
      }
      updated.push(newToast)
      return updated
    })

    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }, [removeToast])

  const success = useCallback((mensagem: string) => addToast('success', mensagem), [addToast])
  const error = useCallback((mensagem: string) => addToast('error', mensagem), [addToast])
  const warning = useCallback((mensagem: string) => addToast('warning', mensagem), [addToast])
  const info = useCallback((mensagem: string) => addToast('info', mensagem), [addToast])

  return (
    <ToastContext.Provider value={{ toasts, success, error, warning, info, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}