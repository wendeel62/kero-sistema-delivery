import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import DivisaoConta from '../components/DivisaoConta'
import { syncCliente } from '../lib/syncCliente'

interface Produto { id: string; nome: string; preco: number; categoria_id: string }
interface Categoria { id: string; nome: string }
interface ItemPedido { produto: Produto; quantidade: number; observacoes: string }
interface Mesa { id: string; numero: number; capacidade: number; status: string; responsavel: string; pessoas: number; aberta_em: string }

export default function PdvPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [filtro, setFiltro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [tabPdv, setTabPdv] = useState<'mesas' | 'produtos'>('produtos')
  const [showOcuparMesa, setShowOcuparMesa] = useState(false)
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [pessoasMesa, setPessoasMesa] = useState(1)
  const [responsavelMesa, setResponsavelMesa] = useState('')
  const [showDivisaoConta, setShowDivisaoConta] = useState(false)
  const [itensMesa, setItensMesa] = useState<any[]>([])
  const [mesaFechar, setMesaFechar] = useState<any>(null)
  const [tipo, setTipo] = useState<'balcao' | 'entrega' | 'mesa'>('balcao')
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [mesaNumero, setMesaNumero] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('dinheiro')
  const [desconto, setDesconto] = useState(0)
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: prods }, { data: cats }, { data: mesasData }] = await Promise.all([
      supabase.from('produtos').select('*').eq('disponivel', true).order('ordem'),
      supabase.from('categorias').select('*').order('ordem'),
      supabase.from('mesas').select('*').order('numero'),
    ])
    if (prods) setProdutos(prods)
    if (cats) setCategorias(cats)
    if (mesasData) setMesas(mesasData)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useRealtime('produtos', fetchData)
  useRealtime('mesas', fetchData)

  const ocuparMesa = async () => {
    if (!mesaSelecionada) return
    await supabase.from('mesas').update({
      status: 'ocupada',
      responsavel: responsavelMesa || null,
      pessoas: pessoasMesa,
      aberta_em: new Date().toISOString(),
    }).eq('id', mesaSelecionada.id)
    setShowOcuparMesa(false)
    setMesaSelecionada(null)
    setPessoasMesa(1)
    setResponsavelMesa('')
    fetchData()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre': return 'bg-green-500/20 border-green-500 text-green-400'
      case 'ocupada': return 'bg-red-500/20 border-red-500 text-red-400'
      case 'aguardando_pagamento': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
      case 'inativa': return 'bg-gray-500/20 border-gray-500 text-gray-400'
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400'
    }
  }

  const getTempoOcupada = (abertaEm: string) => {
    if (!abertaEm) return ''
    const diff = Date.now() - new Date(abertaEm).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}min`
    const hours = Math.floor(mins / 60)
    return `${hours}h ${mins % 60}min`
  }

  const addItem = (p: Produto) => {
    setItens(prev => {
      const existing = prev.find(i => i.produto.id === p.id)
      if (existing) return prev.map(i => i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produto: p, quantidade: 1, observacoes: '' }]
    })
  }

  const removeItem = (id: string) => {
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: i.quantidade - 1 } : i).filter(i => i.quantidade > 0))
  }

  const subtotal = itens.reduce((sum, i) => sum + Number(i.produto.preco) * i.quantidade, 0)
  const total = Math.max(0, subtotal - desconto)

  const salvarPedido = async () => {
    if (itens.length === 0) return
    setSalvando(true)

    const { data: pedido, error: errPed } = await supabase.from('pedidos').insert({
      cliente_nome: clienteNome || null,
      cliente_telefone: clienteTelefone || null,
      tipo,
      mesa_numero: tipo === 'mesa' ? Number(mesaNumero) || null : null,
      subtotal,
      desconto,
      total,
      forma_pagamento: formaPagamento,
      status: 'pendente',
      observacoes: observacoes || null,
      endereco_entrega: tipo === 'entrega' ? enderecoEntrega || null : null,
    }).select().single()

    if (errPed) {
      alert(`Erro ao criar pedido: ${errPed.message}`)
      setSalvando(false)
      return
    }

    if (pedido) {
      const itensInsert = itens.map(i => ({
        pedido_id: pedido.id,
        produto_id: i.produto.id,
        produto_nome: i.produto.nome,
        quantidade: i.quantidade,
        preco_unitario: i.produto.preco,
        total: Number(i.produto.preco) * i.quantidade,
        observacoes: i.observacoes || null,
      }))
      const { error: errItems } = await supabase.from('itens_pedido').insert(itensInsert)
      if (errItems) {
        alert(`Erro ao salvar itens: ${errItems.message}`)
        setSalvando(false)
        return
      }
    }

    await syncCliente(clienteNome, clienteTelefone, total)

    setSalvando(false)
    setSucesso(true)
    setTimeout(() => {
      setSucesso(false)
      setItens([])
      setClienteNome('')
      setClienteTelefone('')
      setMesaNumero('')
      setEnderecoEntrega('')
      setObservacoes('')
      setDesconto(0)
    }, 2000)
  }

  const filteredProdutos = produtos.filter(p => {
    if (filtro && p.categoria_id !== filtro) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  return (
    <div className="animate-fade-in flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left - Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-1 block">Ponto de Venda</span>
            <h2 className="text-4xl font-[Outfit] font-bold text-on-background tracking-tighter">PDV</h2>
          </div>
          <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/10">
            <button onClick={() => setTabPdv('mesas')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${tabPdv === 'mesas' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant'}`}>Mesas</button>
            <button onClick={() => setTabPdv('produtos')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${tabPdv === 'produtos' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant'}`}>Produtos</button>
          </div>
        </div>

        {tabPdv === 'mesas' && (
          <div className="mb-4">
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {mesas.filter(m => m.status !== 'inativa').map(mesa => (
                <div key={mesa.id} className="relative">
                  <button
                    onClick={async () => {
                      setMesaSelecionada(mesa)
                      if (mesa.status === 'livre') {
                        setShowOcuparMesa(true)
                      } else if (mesa.status === 'ocupada' || mesa.status === 'aguardando_pagamento') {
                        const { data: pedidos } = await supabase.from('pedidos').select('*').eq('mesa_numero', mesa.numero).in('status', ['pendente', 'preparando']).order('created_at', { ascending: false }).limit(1)
                        const ultimoPedido = pedidos?.[0]
                        if (ultimoPedido) {
                          const { data: itensPedido } = await supabase.from('itens_pedido').select('*').eq('pedido_id', ultimoPedido.id)
                          setItensMesa(itensPedido || [])
                        } else {
                          setItensMesa([])
                        }
                        setMesaFechar(mesa)
                        setShowDivisaoConta(true)
                      }
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${getStatusColor(mesa.status)}`}
                  >
                    <span className="text-2xl font-bold">{mesa.numero}</span>
                    <span className="text-[10px] uppercase">{mesa.status === 'livre' ? 'Livre' : mesa.status === 'ocupada' ? 'Ocupada' : 'Aguardando'}</span>
                    {mesa.status === 'ocupada' && mesa.aberta_em && (
                      <span className="text-[10px] opacity-70">{getTempoOcupada(mesa.aberta_em)}</span>
                    )}
                  </button>
                  {(mesa.status === 'ocupada' || mesa.status === 'aguardando_pagamento') && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        const { data: pedidos } = await supabase.from('pedidos').select('*').eq('mesa_numero', mesa.numero).in('status', ['pendente', 'preparando']).order('created_at', { ascending: false }).limit(1)
                        const ultimoPedido = pedidos?.[0]
                        if (ultimoPedido) {
                          const { data: itensPedido } = await supabase.from('itens_pedido').select('*').eq('pedido_id', ultimoPedido.id)
                          setItensMesa(itensPedido || [])
                        } else {
                          setItensMesa([])
                        }
                        setMesaFechar(mesa)
                        setShowDivisaoConta(true)
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-black text-xs font-bold"
                      title="Fechar Conta"
                    >
                      $
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tabPdv === 'produtos' && (
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full bg-surface-container border border-outline-variant/10 rounded-xl py-3 px-5 text-sm text-on-surface mb-4 placeholder:text-on-surface-variant/40" />
        )}

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          <button onClick={() => setFiltro(null)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${!filtro ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>Todos</button>
          {categorias.map(c => (
            <button key={c.id} onClick={() => setFiltro(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filtro === c.id ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>{c.nome}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto flex-1">
          {filteredProdutos.map(p => (
            <button key={p.id} onClick={() => addItem(p)} className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 hover:border-primary-container/30 hover:scale-[1.02] transition-all text-left">
              <h4 className="font-[Outfit] font-bold text-sm truncate">{p.nome}</h4>
              <p className="text-sm font-bold text-primary mt-1">{Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right - Cart / Order */}
      <div className="w-96 bg-surface-container rounded-2xl border border-outline-variant/10 flex flex-col">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-[Outfit] font-bold text-lg mb-4">Pedido Atual</h3>
          <div className="flex gap-2">
            {(['balcao', 'entrega', 'mesa'] as const).map(t => (
              <button key={t} onClick={() => setTipo(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${tipo === t ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>{t}</button>
            ))}
          </div>
          {tipo === 'mesa' && (
            <input value={mesaNumero} onChange={e => setMesaNumero(e.target.value)} placeholder="Nº Mesa" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg py-2 px-3 text-sm text-on-surface mt-3" />
          )}
          {tipo === 'entrega' && (
            <input value={enderecoEntrega} onChange={e => setEnderecoEntrega(e.target.value)} placeholder="Endereço de entrega completo" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg py-2 px-3 text-sm text-on-surface mt-3" />
          )}
          <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome do cliente" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg py-2 px-3 text-sm text-on-surface mt-3" />
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {itens.length === 0 ? (
            <div className="text-center text-on-surface-variant/40 py-12">
              <span className="material-symbols-outlined text-4xl mb-2 block">shopping_cart</span>
              <p className="text-sm">Adicione produtos ao pedido</p>
            </div>
          ) : itens.map(item => (
            <div key={item.produto.id} className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{item.produto.nome}</p>
                <p className="text-xs text-on-surface-variant">{Number(item.produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => removeItem(item.produto.id)} className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center"><span className="material-symbols-outlined text-sm">remove</span></button>
                <span className="text-sm font-bold w-5 text-center">{item.quantidade}</span>
                <button onClick={() => addItem(item.produto)} className="w-7 h-7 rounded bg-primary-container flex items-center justify-center text-on-primary-fixed"><span className="material-symbols-outlined text-sm">add</span></button>
              </div>
              <span className="text-sm font-bold w-20 text-right">{(Number(item.produto.preco) * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/10 space-y-3">
          <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg py-2 px-3 text-sm text-on-surface">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_credito">Cartão Crédito</option>
            <option value="cartao_debito">Cartão Débito</option>
          </select>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Subtotal</span>
            <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant">Desconto</span>
            <input type="number" value={desconto || ''} onChange={e => setDesconto(Number(e.target.value))} className="w-24 text-right bg-transparent border-b border-outline-variant/20 text-sm py-0 text-on-surface" />
          </div>
          <div className="flex justify-between pt-2 border-t border-outline-variant/10">
            <span className="font-bold text-lg">Total</span>
            <span className="text-2xl font-[Outfit] font-bold text-primary">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <button onClick={salvarPedido} disabled={itens.length === 0 || salvando} className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${sucesso ? 'bg-green-500 text-white' : 'bg-primary-container text-on-primary-fixed'} disabled:opacity-50`}>
            {salvando ? <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin" /> : sucesso ? '✓ Pedido Salvo!' : 'Finalizar Pedido'}
          </button>
        </div>
      </div>

      {/* Modal Ocupar Mesa */}
      {showOcuparMesa && mesaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowOcuparMesa(false)}>
          <div className="bg-surface-container-high rounded-3xl p-8 w-full max-w-sm border border-outline-variant shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Outfit] text-2xl font-bold mb-2 text-on-surface">Ocupar Mesa {mesaSelecionada.numero}</h3>
            <p className="text-sm text-on-surface-variant mb-6">Informe os dados para abrir a comanda</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-2 block">Número de Pessoas</label>
                <input 
                  type="number" 
                  min="1" 
                  max={mesaSelecionada.capacidade}
                  value={pessoasMesa} 
                  onChange={e => setPessoasMesa(Number(e.target.value))}
                  className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-2 block">Nome do Responsável (opcional)</label>
                <input 
                  value={responsavelMesa} 
                  onChange={e => setResponsavelMesa(e.target.value)}
                  placeholder="Ex: João"
                  className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface" 
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowOcuparMesa(false)} className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm">Cancelar</button>
              <button onClick={ocuparMesa} className="flex-1 py-3 rounded-xl bg-primary-container text-on-primary-fixed font-bold text-sm">Abrir Comanda</button>
            </div>
          </div>
        </div>
      )}

      {showDivisaoConta && mesaFechar && (
        <DivisaoConta
          mesa={mesaFechar}
          itens={itensMesa}
          totalGeral={itensMesa.reduce((sum, item) => sum + (item.total || 0), 0)}
          onFechar={() => {
            setShowDivisaoConta(false)
            setMesaFechar(null)
            fetchData()
          }}
          onCancelar={() => {
            setShowDivisaoConta(false)
            setMesaFechar(null)
          }}
        />
      )}
    </div>
  )
}
