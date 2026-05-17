import { memo } from 'react'
import type { UnifiedPedido } from '../PedidosPage'

export interface PedidoActionsProps {
  pedido: UnifiedPedido
  onAdvance: (pedido: UnifiedPedido) => void
  onCancel: (pedido: UnifiedPedido) => void
  onView: (pedido: UnifiedPedido) => void
  onPrint?: (pedido: UnifiedPedido) => void
  disabled?: boolean
}

export const PedidoActions = memo(function PedidoActions({
  pedido,
  onAdvance,
  onCancel,
  onView,
  onPrint,
  disabled = false
}: PedidoActionsProps) {
  const isCancelled = pedido.status_kanban === 'cancelado'
  const isEntregue = pedido.status_kanban === 'entregue'
  const canAdvance = !isCancelled && !isEntregue

  return (
    <div className="flex gap-2">
      {onPrint && (
        <button
          onClick={() => onPrint(pedido)}
          disabled={disabled}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
          title="Imprimir"
        >
          <span className="material-symbols-outlined text-sm">print</span>
        </button>
      )}
      
      <button
        onClick={() => onView(pedido)}
        disabled={disabled}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
        title="Visualizar"
      >
        <span className="material-symbols-outlined text-sm">visibility</span>
      </button>

      {canAdvance && (
        <>
          <button
            onClick={() => onCancel(pedido)}
            disabled={disabled}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="Cancelar"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
          
          <button
            onClick={() => onAdvance(pedido)}
            disabled={disabled}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#e8391a] text-white hover:scale-105 transition-transform disabled:opacity-50"
            title="Avançar"
          >
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </>
      )}
    </div>
  )
})

export interface PedidoActionsModalProps {
  pedido: UnifiedPedido | null
  onClose: () => void
  onAdvance: (pedido: UnifiedPedido) => void
  onCancel: (pedido: UnifiedPedido) => void
  onPrint?: (pedido: UnifiedPedido) => void
}

export function PedidoActionsModal({
  pedido,
  onClose,
  onAdvance,
  onCancel,
  onPrint
}: PedidoActionsModalProps) {
  if (!pedido) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container p-6 rounded-2xl w-full max-w-sm border border-outline shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-on-background">
            Pedido #{String(pedido.numero).padStart(4, '0')}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onAdvance(pedido)
              onClose()
            }}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-bright text-white font-bold transition-all hover:scale-105"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">arrow_forward</span>
              Avançar Pedido
            </span>
          </button>

          <button
            onClick={() => {
              onCancel(pedido)
              onClose()
            }}
            className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all hover:scale-105"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">cancel</span>
              Cancelar Pedido
            </span>
          </button>

          {onPrint && (
            <button
              onClick={() => {
                onPrint(pedido)
                onClose()
              }}
              className="w-full py-3 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-bold transition-all hover:scale-105"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">print</span>
                Imprimir
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
