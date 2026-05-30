import { useState, useMemo, memo, useCallback } from 'react'
import type { Categoria, Produto } from '../../types'

interface CartItem {
  produto: Produto
  quantidade: number
}

interface ProductSelectorProps {
  produtos: Produto[]
  categorias: Categoria[]
  onConfirm: (itens: Array<{ produto_id: string; produto_nome: string; quantidade: number; preco_unitario: number }>) => void
  onCancel: () => void
}

export const ProductSelector = memo(function ProductSelector({
  produtos,
  categorias,
  onConfirm,
  onCancel
}: ProductSelectorProps) {
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  const filteredProdutos = useMemo(() => {
    let result = produtos
    if (categoriaFiltro) result = result.filter(p => p.categoria_id === categoriaFiltro)
    if (busca) result = result.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    return result
  }, [produtos, categoriaFiltro, busca])

  const addToCart = useCallback((produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(i => i.produto.id === produto.id)
      if (existing) {
        return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      }
      return [...prev, { produto, quantidade: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((produtoId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.produto.id === produtoId)
      if (existing && existing.quantidade > 1) {
        return prev.map(i => i.produto.id === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i)
      }
      return prev.filter(i => i.produto.id !== produtoId)
    })
  }, [])

  const totalCart = useMemo(() =>
    cart.reduce((sum, i) => sum + (i.produto.preco || 0) * i.quantidade, 0),
    [cart]
  )

  const handleConfirm = useCallback(() => {
    onConfirm(cart.map(i => ({
      produto_id: i.produto.id,
      produto_nome: i.produto.nome,
      quantidade: i.quantidade,
      preco_unitario: i.produto.preco || 0,
    })))
  }, [cart, onConfirm])

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-surface-container-high rounded-2xl sm:rounded-3xl p-4 sm:p-8 w-full max-w-3xl border border-outline-variant shadow-2xl max-h-[95vh] flex flex-col animate-fade-in relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">
            Adicionar Produtos
          </h3>
          <button onClick={onCancel} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Busca */}
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full bg-surface-dim rounded-xl px-4 py-2.5 text-sm text-on-background border border-outline focus:border-primary outline-none mb-4"
        />

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
          <button
            onClick={() => setCategoriaFiltro(null)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !categoriaFiltro
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Todos
          </button>
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaFiltro(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                categoriaFiltro === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredProdutos.length === 0 ? (
              <div className="col-span-full text-center py-8 text-on-surface-variant">
                Nenhum produto encontrado
              </div>
            ) : (
              filteredProdutos.map(produto => {
                const cartItem = cart.find(i => i.produto.id === produto.id)
                return (
                  <button
                    key={produto.id}
                    onClick={() => addToCart(produto)}
                    className={`bg-surface-container rounded-xl p-3 border text-left transition-all hover:border-primary/30 ${
                      cartItem ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/10'
                    }`}
                  >
                    <div className="font-bold text-sm text-on-surface truncate">{produto.nome}</div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      {formatCurrency(produto.preco || 0)}
                    </div>
                    {cartItem && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromCart(produto.id) }}
                          className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-dim transition-colors"
                          type="button"
                          aria-label="Remover"
                        >
                          <span className="material-symbols-outlined text-xs">remove</span>
                        </button>
                        <span className="text-sm font-bold text-primary">{cartItem.quantidade}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); addToCart(produto) }}
                          className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center hover:opacity-80 transition-opacity"
                          type="button"
                          aria-label="Adicionar"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                        </button>
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Cart summary + confirm */}
        {cart.length > 0 && (
          <div className="mt-4 pt-4 border-t border-outline-variant/10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-on-surface-variant">
                {cart.reduce((s, i) => s + i.quantidade, 0)} itens selecionados
              </span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalCart)}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-bright transition-colors"
              >
                Adicionar ao Pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
