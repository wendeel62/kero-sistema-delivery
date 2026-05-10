import type { Produto, Categoria, PrecoTamanho } from '../../hooks/useCardapioAdmin'

interface ProdutoListProps {
  produtos: Produto[]
  categorias: Categoria[]
  produtoPrecos: Record<string, PrecoTamanho[]>
  onEdit: (p: Produto) => void
  onDelete: (id: string) => void
  onToggleDisponivel: (p: Produto) => void
  onNew: () => void
}

export default function ProdutoList({
  produtos,
  categorias,
  produtoPrecos,
  onEdit,
  onDelete,
  onToggleDisponivel,
  onNew
}: ProdutoListProps) {
  return (
    <div>
      <button
        onClick={onNew}
        className="mb-6 sm:mb-8 w-full sm:w-auto bg-[#e8391a] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-lg">add</span> Novo Produto
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {produtos.map(p => (
          <div
            key={p.id}
            className={`bg-[#1a1a1a] rounded-2xl border border-[#252830] hover:border-[#e8391a]/20 transition-all group overflow-hidden flex flex-col ${!p.disponivel ? 'opacity-40 grayscale' : ''}`}
          >
            {p.imagem_url ? (
              <div className="h-40 bg-[#252830] overflow-hidden">
                <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-40 bg-[#252830] flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-gray-600">image</span>
              </div>
            )}

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-[Outfit] font-bold text-lg text-white">{p.nome}</h4>
                  <span className="text-[10px] font-bold text-[#e8391a] uppercase tracking-widest">
                    {categorias.find(c => c.id === p.categoria_id)?.nome || 'Sem Categoria'}
                  </span>
                </div>
                <span className="text-lg font-bold text-emerald-400">
                  {produtoPrecos[p.id]?.length
                    ? `R$ ${Math.min(...produtoPrecos[p.id].map(t => Number(t.preco))).toFixed(2)}`
                    : (p.preco ? Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 flex-1 line-clamp-2">{p.descricao}</p>

              {produtoPrecos[p.id]?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {produtoPrecos[p.id].map((pt: any) => (
                    <span key={pt.id} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#252830] text-gray-300">
                      {pt.tamanho} - R$ {Number(pt.preco).toFixed(2)}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#252830]/50 -mx-5 px-5 pb-5 -mb-5 mt-auto">
                <div className="flex gap-2">
                  <button onClick={() => onEdit(p)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button onClick={() => onDelete(p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
                <button
                  onClick={() => onToggleDisponivel(p)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-tighter transition-all ${p.disponivel ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                >
                  {p.disponivel ? 'No Cardapio' : 'Esgotado'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
