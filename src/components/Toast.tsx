import { AnimatePresence, motion } from 'framer-motion'
import { useToast } from '../contexts/ToastContext'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const toastColors = {
  success: { bg: '#22c55e', icon: CheckCircle },
  error: { bg: '#e8391a', icon: XCircle },
  warning: { bg: '#f57c24', icon: AlertTriangle },
  info: { bg: '#3b82f6', icon: Info },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const { icon: Icon, bg } = toastColors[toast.tipo]
          return (
            <motion.div
              key={toast.id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[300px] max-w-[400px]"
              style={{ backgroundColor: '#1a1d24', borderLeft: `4px solid ${bg}` }}
            >
              <Icon className="w-5 h-5 shrink-0" style={{ color: bg }} />
              <p className="flex-1 text-sm text-on-surface">{toast.mensagem}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-surface-container rounded transition-colors"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}