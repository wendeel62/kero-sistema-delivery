import type { Produto } from '../pages/CardapioOnlinePage'

interface ProductCardProps {
  produto: Produto
  preco: number | undefined
  onAddToCart: (p: Produto) => void
}

export default function ProductCard({ produto, preco, onAddToCart }: ProductCardProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 transition-all hover:border-zinc-700 md:flex md:items-center">
      {/* Imagem do Produto */}
      <div className="relative w-full h-48 md:w-32 md:h-32 md:flex-shrink-0">
        {produto.imagem_url ? (
          <img 
            src={produto.imagem_url} 
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-zinc-600 text-4xl!">photo_camera</span>
          </div>
        )}
      </div>

      {/* Área de Conteúdo */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="mb-3">
          <h4 className="font-black uppercase text-lg text-white font-[Outfit] leading-tight mb-1">
            {produto.nome}
          </h4>
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
            {produto.descricao}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-2xl font-bold text-orange-500 font-[Outfit]">
            {preco ? `R$ ${Number(preco).toFixed(2).replace('.', ',')}` : 'Consulte'}
          </span>
          <button 
            onClick={() => onAddToCart(produto)}
            className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <span className="material-symbols-outlined font-bold text-xl!">add</span>
          </button>
        </div>
      </div>
    </div>
  )
}
