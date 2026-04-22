import type { Produto } from '../pages/CardapioOnlinePage'

interface ProductCardProps {
  produto: Produto
  preco: number | undefined
  onAddToCart: (p: Produto) => void
  onImageClick?: (url: string) => void
}

export default function ProductCard({ produto, preco, onAddToCart, onImageClick }: ProductCardProps) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#252830] transition-all hover:border-[#e8391a]/20 flex items-center p-2 sm:p-3 gap-3 sm:gap-4 group">
      {/* Imagem do Produto */}
      <div 
        onClick={() => produto.imagem_url && onImageClick?.(produto.imagem_url)}
        className={`relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[#252830] ${produto.imagem_url ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
      >
        {produto.imagem_url ? (
          <img 
            src={produto.imagem_url} 
            alt={produto.nome}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[#e8391a]/30 text-3xl!">photo_camera</span>
          </div>
        )}
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 flex flex-col justify-between h-24 sm:h-28 py-0.5">
        <div>
          <h4 className="font-bold text-sm sm:text-base text-white font-[Outfit] leading-tight mb-0.5 sm:mb-1 truncate">
            {produto.nome}
          </h4>
          <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-2 leading-tight">
            {produto.descricao}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-base sm:text-lg font-black text-white font-[Outfit]">
            {preco ? Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Consulte'}
          </span>
          <button 
            onClick={(e) => { console.log('Button clicked for:', produto.nome); onAddToCart(produto) }}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#e8391a] text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg shadow-[#e8391a]/20"
          >
            <span className="material-symbols-outlined font-bold text-lg sm:text-xl!">add</span>
          </button>
        </div>
      </div>
    </div>
  )
}
