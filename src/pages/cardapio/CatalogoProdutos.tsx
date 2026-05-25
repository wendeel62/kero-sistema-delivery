import { memo } from 'react'
import type { Produto } from './types'
import { ProdutoCard } from './ProdutoCard'

export interface CatalogoProdutosProps {
  produtos: Produto[]
  precosTamanho: Record<string, Array<Record<string, unknown>>>
  onAddToCart: (produto: Produto) => void
  onImageClick?: (url: string) => void
  className?: string
}

export const CatalogoProdutos = memo(function CatalogoProdutos({
  produtos,
  precosTamanho,
  onAddToCart,
  onImageClick,
  className = ''
}: CatalogoProdutosProps) {
  const getPreco = (produto: Produto) => {
    const precos = precosTamanho[produto.id]
    if (precos && precos.length > 0) {
      return Math.min(...precos.map(p => Number(p.preco)))
    }
    return Number(produto.preco) || 0
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-4 block">
          inventory_2
        </span>
        <p className="text-on-surface-variant">Nenhum produto encontrado</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {produtos.map((produto) => {
        const preco = getPreco(produto)
        return (
          <ProdutoCard
            key={produto.id}
            produto={produto}
            preco={preco}
            onAddToCart={onAddToCart}
            onImageClick={onImageClick}
          />
        )
      })}
    </div>
  )
})
