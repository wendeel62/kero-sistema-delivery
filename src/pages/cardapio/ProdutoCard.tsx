import { memo, useState, useCallback } from 'react'
import type { Produto } from './types'

export interface ProdutoCardProps {
  produto: Produto
  preco: number
  onAddToCart: (produto: Produto) => void
  onImageClick?: (url: string) => void
}

export const ProdutoCard = memo(function ProdutoCard({
  produto,
  preco,
  onAddToCart,
  onImageClick
}: ProdutoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageClick = useCallback(() => {
    if (produto.imagem_url && onImageClick) {
      onImageClick(produto.imagem_url)
    }
  }, [produto.imagem_url, onImageClick])

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 hover:border-primary/20 transition-all group">
      {/* Imagem com lazy loading */}
      <div className="relative aspect-square overflow-hidden bg-surface-container-high">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 animate-pulse bg-surface-container-high" />
        )}
        
        {produto.imagem_url && !imageError ? (
          <>
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true)
                setImageLoaded(true)
              }}
              onClick={handleImageClick}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {onImageClick && (
              <button
                onClick={handleImageClick}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <span className="material-symbols-outlined text-white text-4xl">zoom_in</span>
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
            <span className="material-symbols-outlined text-6xl">restaurant</span>
          </div>
        )}
      </div>

      {/* Informações do produto */}
      <div className="p-3 sm:p-4 space-y-2">
        {/* Nome */}
        <h3 className="font-bold text-sm sm:text-base text-on-surface line-clamp-2">
          {produto.nome}
        </h3>

        {/* Descrição */}
        {produto.descricao && (
          <p className="text-xs text-on-surface-variant line-clamp-2">
            {produto.descricao}
          </p>
        )}

        {/* Preço */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(preco)}
          </span>

          {/* Botão de adicionar */}
          <button
            onClick={() => onAddToCart(produto)}
            disabled={!produto.disponivel}
            className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>

        {/* Badge de indisponível */}
        {!produto.disponivel && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-error text-white px-3 py-1 rounded-full text-xs font-bold">
              Indisponível
            </span>
          </div>
        )}
      </div>
    </div>
  )
})
