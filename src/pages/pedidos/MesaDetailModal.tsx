import { memo, useMemo } from 'react'
import type { UnifiedPedido } from '../PedidosPage'

interface MesaDetailModalProps {
  mesaNumero: number
  pedidos: UnifiedPedido[]
  onClose: () => void
  onAddProduct: (mesaNumero: number) => void
  onCloseBill: (mesaNumero: number) => void
}

export const MesaDetailModal = memo(function MesaDetailModal({
  mesaNumero,
  pedidos,
  onClose,
  onAddProduct,
  onCloseBill
}: MesaDetailModalProps) {
  const itemsAggregated = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; total: number }>()
    pedidos.forEach(p => {
      p.itens.forEach(item => {
        const key = `${item.nome}|${item.variacao || ''}|${item.tamanho || ''}`
        const existing = map.get(key)
        const preco = item.preco || 0
        if (existing) {
          existing.qtd += item.qtd
          existing.total += preco * item.qtd
        } else {
          map.set(key, { nome: item.nome + (item.variacao ? ` (${item.variacao})` : ''), qtd: item.qtd, total: preco * item.qtd })
        }
      })
    })
    return Array.from(map.values())
  }, [pedidos])

  const totalGeral = useMemo(() => pedidos.reduce((s, p) => s + p.total, 0), [pedidos])
  const allEntregue = pedidos.length > 0 && pedidos.every(p => p.status_kanban === 'entregue')

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-surface-container-high rounded-2xl sm:rounded-3xl p-4 sm:p-8 w-full max-w-2xl border border-outline-variant shadow-2xl max-h-[95vh] overflow-y-auto animate-fade-in relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface leading-tight">
              Mesa {mesaNumero}
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} · {itemsAggregated.reduce((s, i) => s + i.qtd, 0)} ite{itemsAggregated.reduce((s, i) => s + i.qtd, 0) !== 1 ? 'ns' : 'm'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Pedidos list */}
        {pedidos.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            Nenhum pedido ativo para esta mesa
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Pedidos</h4>
            {pedidos
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((pedido) => (
                <div key={pedido.id} className="bg-surface-container rounded-xl p-3 border border-outline-variant/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-on-surface">
                      Pedido #{String(pedido.numero).padStart(4, '0')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pedido.status_kanban === 'entregue'
                        ? 'bg-green-500/10 text-green-400'
                        : pedido.status_kanban === 'novo'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {pedido.status_kanban === 'entregue' ? 'Entregue' : pedido.status_kanban === 'novo' ? 'Novo' : 'Em Preparo'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {pedido.itens.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">
                          {item.qtd}x {item.nome}
                          {item.variacao && <span className="text-on-surface-variant/60 text-xs"> ({item.variacao})</span>}
                        </span>
                        {item.preco != null && (
                          <span className="text-on-surface-variant font-medium">
                            {formatCurrency(item.preco * item.qtd)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Aggregated items */}
        {itemsAggregated.length > 0 && (
          <div className="bg-surface-container rounded-xl p-4 mb-6">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">Itens Agregados</h4>
            <div className="space-y-2">
              {itemsAggregated.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-on-surface">
                    {item.qtd}x {item.nome}
                  </span>
                  <span className="text-sm font-medium text-on-surface-variant">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-px bg-outline-variant/10 my-3" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-on-surface">Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalGeral)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => onAddProduct(mesaNumero)}
            className="flex-1 py-3 rounded-xl bg-primary-container text-on-primary-fixed font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Adicionar Produto
          </button>
          {allEntregue && (
            <button
              onClick={() => onCloseBill(mesaNumero)}
              className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">checklist</span>
              Fechar Conta
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
