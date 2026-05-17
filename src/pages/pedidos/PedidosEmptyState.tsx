import { memo } from 'react'

export interface PedidosEmptyStateProps {
  status: string
  message?: string
  icon?: string
  action?: React.ReactNode
}

export const PedidosEmptyState = memo(function PedidosEmptyState({
  status,
  message = 'Nenhum pedido encontrado',
  icon = 'inventory_2',
  action
}: PedidosEmptyStateProps) {
  return (
    <div className="text-center py-8 flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 animate-pulse">
          {icon}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-on-surface-variant">{status}</p>
        <p className="text-xs text-on-surface-variant/60">{message}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
})

export function LoadingState() {
  return (
    <div className="flex items-center justify-center text-[#e8391a] animate-pulse text-sm py-8">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Carregando...
    </div>
  )
}

export function LoadingCard() {
  return (
    <div className="bg-surface-container rounded-xl p-4 animate-pulse space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-4 w-20 bg-surface-variant rounded" />
        <div className="h-4 w-12 bg-surface-variant rounded" />
      </div>
      <div className="h-4 w-32 bg-surface-variant rounded" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-surface-variant rounded" />
        <div className="h-3 w-2/3 bg-surface-variant rounded" />
      </div>
      <div className="flex justify-between items-center">
        <div className="h-6 w-16 bg-surface-variant rounded" />
        <div className="h-8 w-8 bg-surface-variant rounded" />
      </div>
    </div>
  )
}
