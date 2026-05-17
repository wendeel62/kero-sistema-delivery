import { memo } from 'react'

export type StatusKanban = 'novo' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado'

export interface PedidoStatusBadgeProps {
  status: StatusKanban
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const STATUS_CONFIG: Record<StatusKanban, { label: string; color: string; bgColor: string; icon: string }> = {
  novo: { label: 'Novo', color: 'text-[#3b82f6]', bgColor: 'bg-[#3b82f6]/10', icon: 'fiber_new' },
  em_preparo: { label: 'Em Preparo', color: 'text-[#f59e0b]', bgColor: 'bg-[#f59e0b]/10', icon: 'set_meal' },
  saiu_entrega: { label: 'Saiu para Entrega', color: 'text-[#8b5cf6]', bgColor: 'bg-[#8b5cf6]/10', icon: 'delivery_dining' },
  entregue: { label: 'Entregue', color: 'text-[#22c55e]', bgColor: 'bg-[#22c55e]/10', icon: 'check_circle' },
  cancelado: { label: 'Cancelado', color: 'text-[#ef4444]', bgColor: 'bg-[#ef4444]/10', icon: 'cancel' }
}

export const PedidoStatusBadge = memo(function PedidoStatusBadge({
  status,
  size = 'md',
  showLabel = true
}: PedidoStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.novo
  
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  }

  const iconSize = {
    sm: 'text-[10px]',
    md: 'text-[12px]',
    lg: 'text-[14px]'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      <span className={`material-symbols-outlined ${iconSize[size]}`}>
        {config.icon}
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
})

export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    novo: 'text-[#3b82f6]',
    em_preparo: 'text-[#f59e0b]',
    preparando: 'text-[#f59e0b]',
    saiu_entrega: 'text-[#8b5cf6]',
    pronto: 'text-[#8b5cf6]',
    entregue: 'text-[#22c55e]',
    cancelado: 'text-[#ef4444]'
  }
  return statusMap[status] || 'text-gray-400'
}
