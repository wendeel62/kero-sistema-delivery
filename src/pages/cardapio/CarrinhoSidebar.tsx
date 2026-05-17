import { memo, useMemo } from 'react'
import type { Produto } from './types'
import type { CartItem } from './useCarrinho'

export interface CarrinhoSidebarProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  subtotal: number
  taxaEntrega: number
  total: number
  onIncrement: (item: CartItem) => void
  onDecrement: (item: CartItem) => void
  onCheckout: () => void
}

export const CarrinhoSidebar = memo(function CarrinhoSidebar({
  isOpen,
  onClose,
  cart,
  subtotal,
  taxaEntrega,
  total,
  onIncrement,
  onDecrement,
  onCheckout
}: CarrinhoSidebarProps) {
  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const totalItens = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantidade, 0),
    [cart]
  )

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-surface-container z-50 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="p-4 border-b border-outline flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Seu Carrinho</h2>
            <p className="text-xs text-on-surface-variant">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item, index) => (
            <div
              key={`${item.produto.id}-${item.tamanho}-${index}`}
              className="flex gap-3 bg-surface-container-high p-3 rounded-xl"
            >
              {/* Imagem do produto */}
              <div className="w-20 h-20 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                {item.produto.imagem_url ? (
                  <img
                    src={item.produto.imagem_url}
                    alt={item.produto.nome}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant/20">restaurant</span>
                )}
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-on-surface truncate">
                  {item.produto.nome}
                </h3>
                {item.tamanho && (
                  <p className="text-xs text-on-surface-variant">
                    Tamanho: {item.tamanho}
                  </p>
                )}
                {item.tipoPizza === 'meio-a-meio' && item.sabor1 && item.sabor2 && (
                  <p className="text-xs text-on-surface-variant">
                    {item.sabor1} + {item.sabor2}
                  </p>
                )}

                {/* Preço e Quantidade */}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-primary text-sm">
                    {formatCurrency(item.precoUnitario * item.quantidade)}
                  </span>
                  
                  {/* Controles de quantidade */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDecrement(item)}
                      className="w-6 h-6 rounded bg-surface-container flex items-center justify-center hover:bg-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-xs">remove</span>
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantidade}</span>
                    <button
                      onClick={() => onIncrement(item)}
                      className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center hover:bg-primary-bright"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline space-y-3">
          {/* Resumo */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="text-on-surface">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Entrega</span>
              <span className="text-on-surface">{formatCurrency(taxaEntrega)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-outline">
              <span className="text-on-surface">Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Botão de checkout */}
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="w-full py-4 rounded-xl bg-primary text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-bright transition-colors"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>
    </>
  )
})
