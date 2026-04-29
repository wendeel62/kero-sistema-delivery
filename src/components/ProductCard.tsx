import type { Produto } from '../pages/CardapioOnlinePage'

interface ProductCardProps {
  produto: Produto
  preco: number | undefined
  onAddToCart: (p: Produto) => void
  onImageClick?: (url: string) => void
}

export default function ProductCard({ produto, preco, onAddToCart, onImageClick }: ProductCardProps) {
  return (
    <div 
      className="bg-[#16181f] border border-[#252830] rounded-xl overflow-hidden cursor-pointer flex flex-col h-fit hover:border-[#e8391a]/40 transition-all"
    >
      {/* Imagem no topo */}
      <div className="w-full h-28 bg-[#252830] overflow-hidden rounded-t-xl">
        {produto.imagem_url ? (
          <img 
            src={produto.imagem_url} 
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[#e8391a]/30 text-2xl">photo_camera</span>
          </div>
        )}
      </div>

      {/* Bloco inferior com info */}
      <div className="p-2 flex flex-col">
        <h4 className="font-medium text-sm text-[#dde0ee] truncate leading-tight">{produto.nome}</h4>
        <span className="text-sm font-bold text-[#e8391a]">
          {preco ? Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Consulte'}
        </span>
        
        {/* Botão add */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(produto);
          }}
          className="w-8 h-8 rounded-full bg-[#e8391a] text-white flex items-center justify-center ml-auto mt-1 hover:bg-[#ff4422] transition-colors"
        >
          <span className="material-symbols-outlined font-bold text-base">add</span>
        </button>
      </div>
    </div>
  )
}