import type { Produto, Sabor, PrecoTamanho } from '../../hooks/usePdv'

interface VariacoesModalProps {
  show: boolean
  produto: Produto | null
  precosTamanho: Record<string, PrecoTamanho[]>
  sabores: Sabor[]
  tamanhoSelecionado: string
  tipoPizza: 'inteiro' | 'meio-a-meio'
  sabor1: string
  sabor2: string
  onTamanhoChange: (v: string) => void
  onTipoPizzaChange: (v: 'inteiro' | 'meio-a-meio') => void
  onSabor1Change: (v: string) => void
  onSabor2Change: (v: string) => void
  onAddToCart: (p: Produto, preco: number, tamanho?: string, s1?: string, s2?: string, tipo?: 'inteiro' | 'meio-a-meio') => void
  onClose: () => void
}

export default function VariacoesModal({
  show,
  produto,
  precosTamanho,
  sabores,
  tamanhoSelecionado,
  tipoPizza,
  sabor1,
  sabor2,
  onTamanhoChange,
  onTipoPizzaChange,
  onSabor1Change,
  onSabor2Change,
  onAddToCart,
  onClose
}: VariacoesModalProps) {
  if (!show || !produto) return null
  const variants = precosTamanho[produto.id]
  if (!variants) return null

  const handleAdd = () => {
    const pt = variants?.find(x => x.tamanho === tamanhoSelecionado)
    const preco = pt ? Number(pt.preco) : (Number(produto.preco) || 0)
    onAddToCart(produto, preco, tamanhoSelecionado, sabor1, sabor2, tipoPizza)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-8 w-full max-w-md border border-[#252830] shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-[Outfit] text-xl sm:text-2xl font-bold mb-1 text-white">{produto.nome}</h3>
        <p className="text-xs text-gray-400 mb-6">Personalize o produto</p>

        <div className="space-y-4">
          {/* Tamanho */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Tamanho</label>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => onTamanhoChange(pt.tamanho)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${tamanhoSelecionado === pt.tamanho ? 'border-[#e8391a] bg-[#e8391a]/10' : 'border-[#252830] hover:border-gray-700'}`}
                >
                  <span className="font-bold text-white text-xs">{pt.tamanho}</span>
                  <span className="font-bold text-[#e8391a] text-[10px]">{Number(pt.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Formato</label>
            <div className="flex bg-[#16181f] rounded-xl p-1">
              <button onClick={() => { onTipoPizzaChange('inteiro'); onSabor1Change(''); onSabor2Change('') }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoPizza === 'inteiro' ? 'bg-[#e8391a] text-white' : 'text-gray-400'}`}>Inteiro</button>
              <button onClick={() => { onTipoPizzaChange('meio-a-meio'); onSabor1Change(sabores[0]?.nome || ''); onSabor2Change(sabores[1]?.nome || '') }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoPizza === 'meio-a-meio' ? 'bg-[#e8391a] text-white' : 'text-gray-400'}`}>Meio a Meio</button>
            </div>
          </div>

          {/* Sabores */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">{tipoPizza === 'inteiro' ? 'Sabor' : '1º Sabor'}</label>
              <select value={sabor1} onChange={(e) => onSabor1Change(e.target.value)} className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-[#e8391a]">
                <option value="">Selecione</option>
                {sabores.filter(s => s.disponivel).map(s => (<option key={s.id} value={s.nome}>{s.nome}</option>))}
              </select>
            </div>
            {tipoPizza === 'meio-a-meio' && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">2º Sabor</label>
                <select value={sabor2} onChange={(e) => onSabor2Change(e.target.value)} className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-[#e8391a]">
                  <option value="">Selecione</option>
                  {sabores.filter(s => s.disponivel).map(s => (<option key={s.id} value={s.nome}>{s.nome}</option>))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-[#252830] text-gray-400 font-bold text-sm">Cancelar</button>
          <button onClick={handleAdd} disabled={(tipoPizza === 'inteiro' && !sabor1 && sabores.length > 0) || (tipoPizza === 'meio-a-meio' && (!sabor1 || !sabor2))} className="flex-1 py-3.5 rounded-xl bg-[#e8391a] text-white font-bold text-sm disabled:opacity-50">Adicionar</button>
        </div>
      </div>
    </div>
  )
}
