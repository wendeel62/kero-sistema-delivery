import { memo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import type { UnifiedPedido } from '../PedidosPage'
import { PedidoStatusBadge } from './PedidoStatusBadge'

export interface PedidoModalProps {
  pedido: UnifiedPedido | null
  onClose: () => void
  onAdvance: (pedido: UnifiedPedido) => void
  expanded?: boolean
  onToggleExpand?: () => void
}

export const PedidoModal = memo(function PedidoModal({
  pedido,
  onClose,
  onAdvance,
  expanded = false,
  onToggleExpand: _onToggleExpand
}: PedidoModalProps) {
  if (!pedido) return null

  const isCancelled = pedido.status_kanban === 'cancelado'
  const isEntregue = pedido.status_kanban === 'entregue'
  const canAdvance = !isCancelled && !isEntregue

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        role="button"
        tabIndex={0}
      />

      {/* Slide-out Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-[400px] md:w-[450px] bg-surface-container z-[100] border-l border-outline shadow-2xl animate-slide-in-left flex flex-col transition-all duration-300 ${
          expanded ? 'w-full sm:w-[500px]' : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-outline flex justify-between items-center bg-surface-dim/30">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-background">
              Pedido #{String(pedido.numero).padStart(4, '0')}
            </h2>
            <div className="flex gap-2 mt-2 items-center flex-wrap">
              <PedidoStatusBadge status={pedido.status_kanban} size="sm" />
              <span className="text-xs text-on-surface-variant">
                {format(new Date(pedido.created_at), "dd/MM 'às' HH:mm", {
                  locale: ptBR
                })}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors hover:scale-110 active:scale-95"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Cliente */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">person</span>
              Cliente
            </h3>
            <div className="bg-surface-dim/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-outline">
              <p className="font-bold text-base sm:text-lg text-on-background">
                {pedido.cliente_nome}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                {pedido.cliente_telefone || 'Sem telefone'}
              </p>
            </div>
          </section>

          {/* Endereço (se houver) */}
          {pedido.endereco_entrega && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                Endereço
              </h3>
              <div className="bg-surface-dim/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-outline flex justify-between items-start gap-3">
                <p className="text-sm text-on-background/80 leading-relaxed flex-1">
                  {pedido.endereco_entrega}
                </p>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://maps.google.com/?q=${encodeURIComponent(pedido.endereco_entrega)}`}
                  className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                    map
                  </span>
                </a>
              </div>
            </section>
          )}

          {/* Itens do Pedido */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">restaurant_menu</span>
              Pedido
            </h3>
            <div className="bg-surface-dim/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-outline space-y-3">
              {pedido.itens.map((it, i) => (
                <div
                  key={i}
                  className="flex justify-between items-start gap-3 border-b border-outline/50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-bold text-on-background text-sm sm:text-base">
                      {it.qtd}x {it.nome}
                    </p>
                    {it.variacao && (
                      <p className="text-xs text-secondary mt-0.5">
                        {it.variacao}
                      </p>
                    )}
                    {(it as { obs?: string }).obs && (
                      <p className="text-[11px] text-on-surface-variant/40 mt-1 italic">
                        Obs: {(it as { obs?: string }).obs}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer com Pagamento e Ações */}
        <div className="p-4 sm:p-6 border-t border-outline bg-surface-dim">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <span className="text-xs sm:text-sm text-on-surface-variant uppercase tracking-widest font-bold block">
                Pagamento
              </span>
              <span className="text-on-background text-sm">
                {pedido.forma_pagamento}
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400">
              {formatCurrency(pedido.total)}
            </span>
          </div>

          {canAdvance && (
            <button
              onClick={() => onAdvance(pedido)}
              className="w-full h-12 sm:h-14 bg-primary hover:bg-primary-bright text-white font-bold rounded-xl sm:rounded-2xl text-base sm:text-lg transition-all active:scale-[0.98] shadow-lg shadow-primary/30 hover:scale-[1.02]"
            >
              Avançar Pedido
            </button>
          )}
        </div>
      </div>
    </>
  )
})
