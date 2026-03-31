import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface ItemPedido {
  id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  total: number
}

interface Mesa {
  id: string
  numero: number
  responsavel: string
  pessoas: number
}

type TipoDivisao = 'igualitaria' | 'itens' | 'sem_divisao'

interface PagamentoPessoa {
  nome: string
  valor: number
  pago: boolean
  itens: string[]
}

interface Props {
  mesa: Mesa
  itens: ItemPedido[]
  totalGeral: number
  onFechar: () => void
  onCancelar: () => void
}

export default function DivisaoConta({ mesa, itens, totalGeral, onFechar, onCancelar }: Props) {
  const [tipoDivisao, setTipoDivisao] = useState<TipoDivisao>('sem_divisao')
  const [numPessoas, setNumPessoas] = useState(mesa.pessoas || 2)
  const [pessoas, setPessoas] = useState<PagamentoPessoa[]>([])
  const [itensSelecionados, setItensSelecionados] = useState<Record<number, string[]>>({})
  const [salvando, setSalvando] = useState(false)

  const valorPorPessoa = totalGeral / numPessoas

  useEffect(() => {
    if (tipoDivisao === 'igualitaria') {
      setPessoas(Array.from({ length: numPessoas }, (_, i) => ({
        nome: `Pessoa ${i + 1}`,
        valor: valorPorPessoa,
        pago: false,
        itens: []
      })))
    } else if (tipoDivisao === 'sem_divisao') {
      setPessoas([{
        nome: mesa.responsavel || 'Cliente',
        valor: totalGeral,
        pago: false,
        itens: []
      }])
    }
  }, [tipoDivisao, numPessoas, valorPorPessoa, totalGeral, mesa.responsavel])

  const toggleItemPessoa = (pessoaIndex: number, itemId: string) => {
    const current = itensSelecionados[pessoaIndex] || []
    const newItems = current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId]
    
    const newSelection = { ...itensSelecionados, [pessoaIndex]: newItems }
    setItensSelecionados(newSelection)

    const valorItens = newItems.reduce((sum, itemId) => {
      const item = itens.find(i => i.id === itemId)
      return sum + (item?.total || 0)
    }, 0)

    setPessoas(prev => prev.map((p, i) => 
      i === pessoaIndex ? { ...p, valor: valorItens, itens: newItems } : p
    ))
  }

  const togglePago = (index: number) => {
    setPessoas(prev => prev.map((p, i) => 
      i === index ? { ...p, pago: !p.pago } : p
    ))
  }

  const todosPagos = pessoas.every(p => p.pago)
  const totalPago = pessoas.filter(p => p.pago).reduce((sum, p) => sum + p.valor, 0)

  const finalizarConta = async () => {
    if (!todosPagos) return
    setSalvando(true)

    await supabase.from('mesas').update({
      status: 'livre',
      responsavel: null,
      pessoas: 0,
      aberta_em: null
    }).eq('id', mesa.id)

    setSalvando(false)
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-surface-container-high rounded-3xl p-8 w-full max-w-2xl border border-outline-variant shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-[Outfit] text-2xl font-bold text-on-surface">Fechar Mesa {mesa.numero}</h3>
            <p className="text-sm text-on-surface-variant">Selecione a forma de divisão</p>
          </div>
          <button onClick={onCancelar} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tipo de Divisão */}
        <div className="flex bg-surface-container rounded-xl p-1 mb-6">
          {[
            { key: 'sem_divisao', label: 'Sem Divisão' },
            { key: 'igualitaria', label: 'Igualitária' },
            { key: 'itens', label: 'Por Itens' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setTipoDivisao(opt.key as TipoDivisao)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tipoDivisao === opt.key ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Configuração de Pessoas (para divisão igualitária) */}
        {tipoDivisao === 'igualitaria' && (
          <div className="mb-6">
            <label className="text-sm font-bold text-on-surface-variant mb-2 block">Número de pessoas</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setNumPessoas(Math.max(2, numPessoas - 1))} className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="text-2xl font-bold text-on-surface w-12 text-center">{numPessoas}</span>
              <button onClick={() => setNumPessoas(Math.min(20, numPessoas + 1))} className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <p className="text-sm text-on-surface-variant mt-2">Valor por pessoa: <span className="font-bold text-primary">{valorPorPessoa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
          </div>
        )}

        {/* Lista de Pessoas */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-bold text-on-surface-variant">Pagamentos</h4>
          
          {pessoas.map((pessoa, index) => (
            <div key={index} className={`p-4 rounded-xl border ${pessoa.pago ? 'bg-green-500/10 border-green-500/30' : 'bg-surface-container border-outline-variant/10'}`}>
              <div className="flex justify-between items-center mb-2">
                <input
                  value={pessoa.nome}
                  onChange={(e) => setPessoas(prev => prev.map((p, i) => i === index ? { ...p, nome: e.target.value } : p))}
                  className="bg-transparent font-bold text-on-surface border-b border-transparent focus:border-primary outline-none"
                />
                <span className="text-lg font-bold text-primary">
                  {pessoa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              
              {tipoDivisao === 'itens' && (
                <div className="mt-3 pt-3 border-t border-outline-variant/10">
                  <p className="text-xs text-on-surface-variant mb-2">Selecione os itens:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {itens.map(item => {
                      const selected = itensSelecionados[index]?.includes(item.id)
                      return (
                        <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-container-high p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selected || false}
                            onChange={() => toggleItemPessoa(index, item.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs flex-1">{item.quantidade}x {item.produto_nome}</span>
                          <span className="text-xs font-bold">{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => togglePago(index)}
                className={`w-full mt-3 py-2 rounded-lg font-bold text-sm transition-all ${pessoa.pago ? 'bg-green-500 text-white' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}
              >
                {pessoa.pago ? '✓ Pago' : 'Marcar como Pago'}
              </button>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="bg-surface-container rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-on-surface-variant">Total</span>
            <span className="font-bold">{totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Pago</span>
            <span className="font-bold text-green-400">{totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 mt-2 border-t border-outline-variant/10">
            <span className="text-on-surface-variant">Restante</span>
            <span className="font-bold text-red-400">{(totalGeral - totalPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm">
            Cancelar
          </button>
          <button 
            onClick={finalizarConta} 
            disabled={!todosPagos || salvando}
            className="flex-1 py-3 rounded-xl bg-primary-container text-on-primary-fixed font-bold text-sm disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Fechar Mesa'}
          </button>
        </div>
      </div>
    </div>
  )
}
