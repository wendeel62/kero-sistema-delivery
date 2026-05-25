import type { Produto, Sabor, PrecoTamanho } from '../../hooks/cardapio/types'

interface ComplementosTabProps {
  sabores: Sabor[]
  produtos: Produto[]
  produtoPrecos: Record<string, PrecoTamanho[]>
  selectedProdutoComplementos: Produto | null
  newTamanho: string
  newPrecoValor: string
  tenantId: string | null
  onToggleSaborDisponivel: (s: Sabor) => void
  onEditSabor: (s: Sabor) => void
  onDeleteSabor: (id: string) => void
  onNewSabor: () => void
  onSelectProduto: (p: Produto) => void
  onAddPreco: (produtoId: string) => void
  onDeletePreco: (precoId: string) => void
  onNewTamanhoChange: (v: string) => void
  onNewPrecoValorChange: (v: string) => void
}

export default function ComplementosTab({
  sabores,
  produtos,
  produtoPrecos,
  selectedProdutoComplementos,
  newTamanho,
  newPrecoValor,
  tenantId: _tenantId,
  onToggleSaborDisponivel,
  onEditSabor,
  onDeleteSabor,
  onNewSabor,
  onSelectProduto,
  onAddPreco,
  onDeletePreco,
  onNewTamanhoChange,
  onNewPrecoValorChange
}: ComplementosTabProps) {
  return (
    <div>
      {/* Sabores Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-[Outfit] font-bold text-white">Sabores de Pizza</h3>
          <button onClick={onNewSabor} className="bg-[#e8391a] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span> Novo Sabor
          </button>
        </div>

        {sabores.length === 0 ? (
          <div className="p-8 bg-[#1a1a1a] rounded-xl border border-[#252830] text-center">
            <p className="text-gray-400">Nenhum sabor cadastrado ainda.</p>
            <p className="text-xs text-gray-500 mt-2">Cadastre os sabores das pizzas para permitir meio a meio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sabores.map(sabor => (
              <div key={sabor.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-[#252830] flex justify-between items-start">
                <div>
                  <h4 className="font-[Outfit] font-bold text-white">{sabor.nome}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sabor.descricao}</p>
                  <button
                    onClick={() => onToggleSaborDisponivel(sabor)}
                    className={`inline-block mt-2 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer ${sabor.disponivel ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                  >
                    {sabor.disponivel ? 'Disponivel' : 'Indisponivel'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEditSabor(sabor)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button onClick={() => onDeleteSabor(sabor.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-[#252830] my-8" />

      {/* Complementos Management */}
      <div className="mb-6 p-4 bg-[#1a1a1a] rounded-xl border border-[#252830]">
        <p className="text-sm text-gray-400">
          Gerencie os tamanhos e precos dos produtos (ex: Pizzas - P, M, G, GG).<br />
          Selecione um produto abaixo para adicionar ou editar seus complementos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {produtos.filter(p => produtoPrecos[p.id]?.length > 0).map(p => (
          <div
            key={p.id}
            onClick={() => onSelectProduto(p)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectProduto(p) } }}
            role="button"
            tabIndex={0}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedProdutoComplementos?.id === p.id
                ? 'bg-[#e8391a]/20 border-[#e8391a]'
                : 'bg-[#1a1a1a] border-[#252830] hover:border-[#e8391a]/30'
            }`}
          >
            <h4 className="font-[Outfit] font-bold text-white">{p.nome}</h4>
            <div className="mt-2 flex flex-wrap gap-1">
              {produtoPrecos[p.id]?.map(pt => (
                <span key={pt.id} className="text-[10px] bg-[#252830] px-2 py-1 rounded-full text-gray-400">
                  {pt.tamanho}: R$ {Number(pt.preco).toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Produto Complementos Detail */}
      {selectedProdutoComplementos && (
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-[Outfit] font-bold text-white">
              {selectedProdutoComplementos.nome} - Complementos
            </h3>
            <button onClick={() => onSelectProduto(null as any)} className="text-gray-400 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Tamanhos cadastrados</h4>
            {produtoPrecos[selectedProdutoComplementos.id]?.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum tamanho cadastrado ainda.</p>
            ) : (
              produtoPrecos[selectedProdutoComplementos.id]?.map(pt => (
                <div key={pt.id} className="flex items-center justify-between bg-[#252830] p-4 rounded-xl border border-[#333]">
                  <span className="text-sm font-bold uppercase tracking-widest text-white">{pt.tamanho} -- <span className="text-emerald-400">R$ {Number(pt.preco).toFixed(2)}</span></span>
                  <button onClick={() => onDeletePreco(pt.id)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[#252830] pt-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Adicionar novo tamanho</h4>
            <div className="flex gap-3">
              <input
                value={newTamanho}
                onChange={e => onNewTamanhoChange(e.target.value)}
                placeholder="Tamanho (Ex: P, M, G, GG)"
                className="flex-1 bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white"
              />
              <input
                value={newPrecoValor}
                onChange={e => onNewPrecoValorChange(e.target.value)}
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                className="w-32 bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white"
              />
              <button
                onClick={() => onAddPreco(selectedProdutoComplementos.id)}
                className="bg-[#e8391a] text-white px-6 rounded-xl text-sm font-bold uppercase"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Produtos sem complementos */}
      {produtos.filter(p => !produtoPrecos[p.id]?.length).length > 0 && (
        <div className="mt-8">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Produtos sem complementos ainda</h4>
          <div className="flex flex-wrap gap-2">
            {produtos.filter(p => !produtoPrecos[p.id]?.length).map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProduto(p)}
                className="px-4 py-2 bg-[#1a1a1a] rounded-full text-xs font-bold text-gray-400 hover:bg-[#e8391a]/20 hover:text-[#e8391a] transition-all"
              >
                + {p.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
