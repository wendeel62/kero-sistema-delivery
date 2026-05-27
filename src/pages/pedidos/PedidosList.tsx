import { memo, useMemo, useRef } from 'react'
import type { UnifiedPedido } from '../PedidosPage'
import { type StatusKanban } from './PedidoStatusBadge'

export interface PedidosListProps {
  pedidos: UnifiedPedido[]
  onAdvance: (pedido: UnifiedPedido) => void
  onCancel: (pedido: UnifiedPedido) => void
  onView: (pedido: UnifiedPedido) => void
  onPrint?: (pedido: UnifiedPedido) => void
  isLoading?: boolean
  className?: string
}

const COLUMNS = [
  { id: 'novo' as StatusKanban, title: 'Novo', color: '#3b82f6', textColor: 'text-[#3b82f6]' },
  { id: 'em_preparo' as StatusKanban, title: 'Em Preparo', color: '#f59e0b', textColor: 'text-[#f59e0b]' },
  { id: 'saiu_entrega' as StatusKanban, title: 'Saiu para Entrega', color: '#8b5cf6', textColor: 'text-[#8b5cf6]' },
  { id: 'entregue' as StatusKanban, title: 'Entregue', color: '#22c55e', textColor: 'text-[#22c55e]' },
  { id: 'cancelado' as StatusKanban, title: 'Cancelado', color: '#ef4444', textColor: 'text-[#ef4444]' }
] as const

export const PedidosList = memo(function PedidosList({
  pedidos,
  onAdvance,
  onCancel,
  onView,
  onPrint,
  isLoading = false,
  className = ''
}: PedidosListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const columnsData = useMemo(() => {
    const cols: Record<StatusKanban, UnifiedPedido[]> = {
      novo: [],
      em_preparo: [],
      saiu_entrega: [],
      entregue: [],
      cancelado: []
    }
    pedidos.forEach(p => cols[p.status_kanban].push(p))
    return cols
  }, [pedidos])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant">Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  if (pedidos.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">
          inventory_2
        </span>
        <p className="text-on-surface-variant">Nenhum pedido encontrado</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`flex w-full gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar ${className}`}
    >
      <div className="flex gap-2 w-full min-w-max">
        {COLUMNS.map((col) => {
          const colPedidos = columnsData[col.id] || []

          return (
            <div
              key={col.id}
              className="flex-none w-[85vw] sm:w-[300px] md:flex-1 md:min-w-0 flex flex-col snap-start"
            >
              {/* Column Header */}
              <div className="bg-[#16181f] rounded-t-xl p-3">
                <div className="h-1 rounded-t-xl mb-2" style={{ backgroundColor: col.color }} />
                <div className="flex justify-between items-center">
                  <h2 className={`${col.textColor} text-sm font-semibold uppercase tracking-wider`}>
                    {col.title}
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: col.color }}
                  >
                    {colPedidos.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="bg-[#0f1117] rounded-b-xl p-2 flex flex-col gap-2 flex-1 overflow-y-auto min-h-[300px] max-h-[calc(100vh-300px)]">
                {colPedidos.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-sm flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                    Vazio
                  </div>
                ) : (
                  colPedidos.map((pedido) => (
                    <PedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      onAdvance={onAdvance}
                      onCancel={onCancel}
                      onView={onView}
                      onPrint={onPrint}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

interface PedidoCardProps {
  pedido: UnifiedPedido
  onAdvance: (pedido: UnifiedPedido) => void
  onCancel: (pedido: UnifiedPedido) => void
  onView: (pedido: UnifiedPedido) => void
  onPrint?: (pedido: UnifiedPedido) => void
}

const PedidoCard = memo(function PedidoCard({
  pedido,
  onAdvance,
  onCancel,
  onView,
  onPrint
}: PedidoCardProps) {
  const minutesElapsed = useMemo(() => {
    const now = new Date()
    const created = new Date(pedido.created_at)
    return Math.floor((now.getTime() - created.getTime()) / 60000)
  }, [pedido.created_at])

  const isCancelled = pedido.status_kanban === 'cancelado'
  const isEntregue = pedido.status_kanban === 'entregue'

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="bg-[#16181f] border border-[#252830] rounded-xl p-3 hover:border-[#353840] transition-all flex flex-col gap-2 cursor-pointer">
      {/* Header: Número + Tempo */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-[#e8391a]">
          #{String(pedido.numero).padStart(4, '0')}
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="material-symbols-outlined text-xs">schedule</span>
          <span>{minutesElapsed}m</span>
        </div>
      </div>

      {/* Cliente */}
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-[#dde0ee]">{pedido.cliente_nome}</h3>
        {pedido.canal === 'mesa' && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b] text-black">
            MESA {pedido.mesa_numero}
          </span>
        )}
        {(pedido.forma_pagamento?.includes('cartao') || pedido.forma_pagamento?.toUpperCase() === 'PIX') &&
          isEntregue && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500 text-white">
              PAGO
            </span>
          )}
      </div>

      {/* Itens */}
      <div className="flex flex-col gap-0.5">
        {pedido.itens.slice(0, 3).map((it, i) => (
          <p key={i} className="text-xs text-gray-400 truncate">
            {it.qtd}x {it.nome}
          </p>
        ))}
        {pedido.itens.length > 3 && (
          <p className="text-xs text-gray-500">+{pedido.itens.length - 3} itens</p>
        )}
        {pedido.itens.length === 0 && (
          <p className="text-xs text-gray-500">Sem itens</p>
        )}
      </div>

      {/* Footer: Valor + Ações */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-[#e8391a]">
          {formatCurrency(pedido.total)}
        </span>
        <div className="flex gap-2">
          {onPrint && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPrint(pedido)
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Imprimir"
            >
              <span className="material-symbols-outlined text-sm">print</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onView(pedido)
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
          </button>

          {!isCancelled && !isEntregue && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel(pedido)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAdvance(pedido)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#e8391a] text-white hover:scale-105 transition-transform"
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
})
