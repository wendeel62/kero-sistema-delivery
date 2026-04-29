import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import DivisaoConta from '../components/DivisaoConta'
import { syncCliente } from '../lib/syncCliente'
import type { Produto } from './CardapioOnlinePage'
import ProductCard from '../components/ProductCard'

interface Categoria { id: string; nome: string }
interface ItemPedido { produto: Produto; quantidade: number; observacoes: string; tamanho?: string; sabor1?: string; sabor2?: string; tipoPizza?: 'inteiro' | 'meio-a-meio'; adicionais?: string; pontoCarne?: string }
interface Mesa { id: string; numero: number; capacidade: number; status: string; responsavel: string; pessoas: number; aberta_em: string }
interface PrecoTamanho { id: string; produto_id: string; tamanho: string; preco: number }
interface Sabor { id: string; nome: string; descricao: string; disponivel: boolean }

export default function PdvPage() {
  const { user } = useAuth()
  const tenantId = user?.id
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [cartPulse, setCartPulse] = useState(false)
  const [precosTamanho, setPrecosTamanho] = useState<Record<string, PrecoTamanho[]>>({})
  const pedidoAtualRef = useRef<HTMLDivElement>(null)
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [showVariacoesModal, setShowVariacoesModal] = useState(false)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>('')
  const [tipoPizza, setTipoPizza] = useState<'inteiro' | 'meio-a-meio'>('inteiro')
  const [sabor1, setSabor1] = useState<string>('')
  const [sabor2, setSabor2] = useState<string>('')
  const [filtro, setFiltro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
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
  const [pedidoMesaSalvo, setPedidoMesaSalvo] = useState(false)
  const [mesaDosPedido, setMesaDosPedido] = useState<Mesa | null>(null)
  const [showMesasPanel, setShowMesasPanel] = useState(false)
  const [mesasComItens, setMesasComItens] = useState<Record<string, any[]>>({})
  const [mesaExpandida, setMesaExpandida] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [{ data: prods }, { data: cats }, { data: mesasData }, { data: precos }, { data: saboresData }] = await Promise.all([
      supabase.from('produtos').select('*').eq('tenant_id', tenantId).eq('disponivel', true).order('ordem'),
      supabase.from('categorias').select('*').eq('tenant_id', tenantId).order('ordem'),
      supabase.from('mesas').select('*').eq('tenant_id', tenantId).order('numero'),
      supabase.from('precos_tamanho').select('*').eq('tenant_id', tenantId),
      supabase.from('sabores').select('*').eq('tenant_id', tenantId).eq('disponivel', true).order('nome'),
    ])
    if (prods) setProdutos(prods)
    if (cats) setCategorias(cats)
    if (mesasData) setMesas(mesasData)
    if (saboresData) setSabores(saboresData)
    if (precos) {
      const grouped: Record<string, PrecoTamanho[]> = {}
      precos.forEach(p => {
        if (!grouped[p.produto_id]) grouped[p.produto_id] = []
        grouped[p.produto_id].push(p)
      })
      setPrecosTamanho(grouped)
    }
  }, [tenantId])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  useRealtime({
    configs: [
      { table: 'produtos', filter: `tenant_id=eq.${tenantId}`, callback: fetchData },
      { table: 'mesas', filter: `tenant_id=eq.${tenantId}`, callback: fetchData }
    ]
  })

  const ocuparMesa = async () => {
    if (!mesaSelecionada) return
    await supabase.from('mesas').update({
      status: 'ocupada',
      responsavel: responsavelMesa || null,
      pessoas: pessoasMesa,
      aberta_em: new Date().toISOString(),
    }).eq('id', mesaSelecionada.id).eq('tenant_id', tenantId)
    setShowOcuparMesa(false)
    setMesaSelecionada(null)
    setPessoasMesa(1)
    setResponsavelMesa('')
    fetchData()
  }

  const getTempoOcupada = useCallback((abertaEm: string) => {
    if (!abertaEm) return ''
    const diff = Date.now() - new Date(abertaEm).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}min`
    const hours = Math.floor(mins / 60)
    return `${hours}h ${mins % 60}min`
  }, [])

  const addItem = (p: Produto) => {
    console.log('addItem called:', p.nome, 'preco:', p.preco, 'variants:', precosTamanho[p.id])
    const variants = precosTamanho[p.id]
    
    // Se tem variantes de tamanho OU produto não tem preço, abre modal para selecionar tamanho
    if ((variants && variants.length > 0) || !p.preco || Number(p.preco) === 0) {
      setProdutoSelecionado(p)
      setTamanhoSelecionado(variants?.[0]?.tamanho || '')
      setTipoPizza('inteiro')
      setSabor1('')
      setSabor2('')
      setShowVariacoesModal(true)
      return
    }
    
    // Tem preço específico, adiciona direto
    addToCart(p, Number(p.preco))
  }

  const addToCart = (p: Produto, preco: number, tamanho?: string, s1?: string, s2?: string, tipo?: 'inteiro' | 'meio-a-meio') => {
    setItens(prev => {
      const existing = prev.find(i => 
        i.produto.id === p.id && 
        i.tamanho === tamanho && 
        i.sabor1 === s1 && 
        i.sabor2 === s2
      )
      if (existing) {
        return prev.map(i => 
          (i.produto.id === p.id && i.tamanho === tamanho && i.sabor1 === s1 && i.sabor2 === s2) 
            ? { ...i, quantidade: i.quantidade + 1 } 
            : i
        )
      }
      return [...prev, { 
        produto: { ...p, preco }, 
        quantidade: 1, 
        observacoes: '', 
        tamanho, 
        sabor1: s1, 
        sabor2: s2, 
        tipoPizza: tipo 
      }]
    })
    
    setCartPulse(true)
    setTimeout(() => setCartPulse(false), 300)
    setShowVariacoesModal(false)
    setProdutoSelecionado(null)
  }

  const removeItem = (id: string) => {
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: i.quantidade - 1 } : i).filter(i => i.quantidade > 0))
  }

  const subtotal = itens.reduce((sum, i) => sum + Number(i.produto.preco) * i.quantidade, 0)
  const total = Math.max(0, subtotal - desconto)

  const salvarPedido = async () => {
    if (itens.length === 0) return
    
    // Validação: Obrigatório apenas para entrega
    if (tipo === 'entrega') {
      if (!clienteNome || !clienteTelefone) {
        alert('Nome e Telefone são obrigatórios para pedidos de entrega!')
        return
      }
      if (!enderecoEntrega) {
        alert('Endereço de entrega é obrigatório!')
        return
      }
    }

    setSalvando(true)

    const { data: pedido, error: errPed } = await supabase.from('pedidos').insert({
      tenant_id: tenantId,
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
        tenant_id: tenantId,
        pedido_id: pedido.id,
        produto_id: i.produto.id,
        produto_nome: i.produto.nome + (i.tamanho ? ` (${i.tamanho})` : '') + (i.sabor1 ? ` - ${i.sabor1}` : '') + (i.sabor2 ? ` + ${i.sabor2}` : ''),
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

    if (clienteNome || clienteTelefone) {
      await syncCliente(clienteNome, clienteTelefone, total)
    }

    setSalvando(false)
    setSucesso(true)
    if (tipo === 'mesa') {
      const mesaEncontrada = mesas.find(m => m.numero === Number(mesaNumero))
      if (mesaEncontrada) {
        setPedidoMesaSalvo(true)
        setMesaDosPedido(mesaEncontrada)
      }
    }
    setTimeout(() => {
      setSucesso(false)
      setItens([])
      setClienteNome('')
      setClienteTelefone('')
      setMesaNumero('')
      setEnderecoEntrega('')
      setObservacoes('')
      setDesconto(0)
    }, 10000)
  }

  const filteredProdutos = produtos.filter(p => {
    if (filtro && p.categoria_id !== filtro) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre': return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
      case 'ocupada': return 'border-[#e8391a]/40 bg-[#e8391a]/10 text-[#e8391a]'
      case 'aguardando_pagamento': return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
      case 'inativa': return 'border-gray-600 bg-gray-600/10 text-gray-400'
      default: return 'border-gray-600 bg-gray-600/10 text-gray-400'
    }
  }

  const abrirPainelMesas = async () => {
    const mesasOcupadas = mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento')
    const dados: Record<string, any[]> = {}
    await Promise.all(mesasOcupadas.map(async (mesa) => {
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('mesa_numero', mesa.numero)
        .in('status', ['pendente', 'preparando'])
        .order('created_at', { ascending: false })
        .limit(1)
      const ultimoPedido = pedidos?.[0]
      if (ultimoPedido) {
        const { data: itensPedido } = await supabase
          .from('itens_pedido')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('pedido_id', ultimoPedido.id)
        dados[mesa.id] = itensPedido || []
      } else {
        dados[mesa.id] = []
      }
    }))
    setMesasComItens(dados)
    setShowMesasPanel(true)
  }

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-3 lg:gap-6 min-h-[calc(100vh-6rem)] p-2 sm:p-3 lg:p-6">
      {/* Left - Product Grid / Mesas */}
      <div className="flex-1 flex flex-col min-w-0 flex">
        <div className="mb-3 lg:mb-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <span className="text-[#e8391a] font-bold uppercase tracking-[0.3em] text-[10px] mb-0.5 block">Ponto de Venda</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-[Outfit] font-bold text-white tracking-tighter">PDV</h2>
          </div>
          <div className="flex bg-[#1a1a1a] rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-[#252830]">
            <button
              onClick={abrirPainelMesas}
              className="lg:flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all bg-[#252830] text-yellow-400 border border-yellow-500/30"
            >
              <span className="material-symbols-outlined text-sm">table_restaurant</span>
              Mesas
              {mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento').length > 0 && (
                <span className="w-4 h-4 flex items-center justify-center rounded-full text-[8px] bg-yellow-500 text-black font-black">
                  {mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento').length}
                </span>
              )}
            </button>
            <button onClick={() => pedidoAtualRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={`lg:hidden flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all bg-[#e8391a] text-white ${cartPulse ? 'scale-110' : ''}`}>
              Carrinho
              {itens.length > 0 && (
                <span className="w-4 h-4 flex items-center justify-center rounded-full text-[8px] animate-in fade-in zoom-in duration-300 bg-white text-[#e8391a]">
                  {itens.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mesas - sempre visível */}
          <div className="mb-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {mesas.filter(m => m.status !== 'inativa').map(mesa => (
                <div key={mesa.id} className="relative">
                  <button
                    onClick={async () => {
                      setMesaSelecionada(mesa)
                      if (mesa.status === 'livre') {
                        setShowOcuparMesa(true)
                      } else if (mesa.status === 'ocupada' || mesa.status === 'aguardando_pagamento') {
                        const { data: pedidos } = await supabase.from('pedidos').select('*').eq('tenant_id', tenantId).eq('mesa_numero', mesa.numero).in('status', ['pendente', 'preparando']).order('created_at', { ascending: false }).limit(1)
                        const ultimoPedido = pedidos?.[0]
                        if (ultimoPedido) {
                          const { data: itensPedido } = await supabase.from('itens_pedido').select('*').eq('tenant_id', tenantId).eq('pedido_id', ultimoPedido.id)
                          setItensMesa(itensPedido || [])
                        } else {
                          setItensMesa([])
                        }
                        setMesaFechar(mesa)
                        setShowDivisaoConta(true)
                      }
                    }}
                    className={`w-full p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${getStatusColor(mesa.status)}`}
                  >
                    <span className="text-lg sm:text-xl font-bold">{mesa.numero}</span>
                    <span className="text-[8px] sm:text-[10px] uppercase">{mesa.status === 'livre' ? 'Livre' : mesa.status === 'ocupada' ? 'Ocupada' : 'Aguardando'}</span>
                    {mesa.status === 'ocupada' && mesa.aberta_em && (
                      <span className="text-[8px] sm:text-[10px] opacity-70">{getTempoOcupada(mesa.aberta_em)}</span>
                    )}
                  </button>
                  {(mesa.status === 'ocupada' || mesa.status === 'aguardando_pagamento') && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        const { data: pedidos } = await supabase.from('pedidos').select('*').eq('tenant_id', tenantId).eq('mesa_numero', mesa.numero).in('status', ['pendente', 'preparando']).order('created_at', { ascending: false }).limit(1)
                        const ultimoPedido = pedidos?.[0]
                        if (ultimoPedido) {
                          const { data: itensPedido } = await supabase.from('itens_pedido').select('*').eq('tenant_id', tenantId).eq('pedido_id', ultimoPedido.id)
                          setItensMesa(itensPedido || [])
                        } else {
                          setItensMesa([])
                        }
                        setMesaFechar(mesa)
                        setShowDivisaoConta(true)
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center text-black text-[10px] sm:text-xs font-bold"
                      title="Fechar Conta"
                    >
                      $
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-2 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm text-white mb-3 lg:mb-4 placeholder:text-gray-500" />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 lg:mb-4">
          <button onClick={() => setFiltro(null)} className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${!filtro ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>Todos</button>
          {categorias.map(c => (
            <button key={c.id} onClick={() => setFiltro(c.id)} className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${filtro === c.id ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>{c.nome}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start overflow-y-auto flex-1 pb-4 custom-scrollbar pr-2 pt-1">
          {filteredProdutos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
              <p className="text-sm">Nenhum produto encontrado</p>
              <p className="text-xs mt-1">Cadastre produtos no Cardápio Admin</p>
            </div>
          ) : filteredProdutos.map(p => {
             // Buscar preço mínimo se houver variações
             const preco = precosTamanho[p.id]?.length 
               ? Math.min(...precosTamanho[p.id].map(t => Number(t.preco)))
               : Number(p.preco)

             return (
                <ProductCard 
                  key={p.id}
                  produto={p}
                  preco={preco}
                  onAddToCart={() => addItem(p)}
                />
              )
           })}
        </div>
      </div>

      {/* Right - Cart / Order */}
      <div ref={pedidoAtualRef} className="w-full lg:flex-1 bg-[#1a1a1a] rounded-2xl border border-[#252830] flex flex-col shrink-0 flex">
        <div className="p-4 lg:p-6 border-b border-[#252830]">
          <div className="flex justify-between items-center mb-3 lg:mb-4">
            <h3 className="font-[Outfit] font-bold text-base lg:text-lg text-white">Pedido Atual</h3>
          </div>
          <div className="flex gap-2">
            {(['balcao', 'entrega', 'mesa'] as const).map(t => (
              <button key={t} onClick={() => setTipo(t)} className={`flex-1 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${tipo === t ? 'bg-[#e8391a] text-white' : 'bg-[#252830] text-gray-400'}`}>{t}</button>
            ))}
          </div>
          {tipo === 'mesa' && (
            <input value={mesaNumero} onChange={e => setMesaNumero(e.target.value)} placeholder="Nº Mesa" className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />
          )}
          {tipo === 'entrega' && (
            <input value={enderecoEntrega} onChange={e => setEnderecoEntrega(e.target.value)} placeholder="Endereço de entrega completo" className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />
          )}
          <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder={tipo === 'entrega' ? "Nome do cliente *" : "Nome do cliente (Opcional)"} className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />
          <input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} placeholder={tipo === 'entrega' ? "Telefone (WhatsApp) *" : "Telefone (WhatsApp - Opcional)"} className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white mt-3" />
        </div>

        {/* Items */}
        <div className="p-4 space-y-2">
          {itens.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <span className="material-symbols-outlined text-4xl mb-2 block">shopping_cart</span>
              <p className="text-sm">Adicione produtos ao pedido</p>
            </div>
          ) : (
            <>
              {itens.map(item => {
                const detalhes: string[] = []
                if (item.tamanho) detalhes.push(item.tamanho)
                if (item.sabor1) detalhes.push(item.sabor1)
                if (item.sabor2) detalhes.push(item.sabor2)
                if (item.pontoCarne) detalhes.push(item.pontoCarne)
                if (item.adicionais) detalhes.push(item.adicionais)
                if (item.observacoes) detalhes.push(item.observacoes)
                const detalheStr = detalhes.join(' | ')

                return (
                  <div key={item.produto.id} className="flex items-center gap-3 bg-[#252830] p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-white">{item.produto.nome}</p>
                      {detalheStr && <p className="text-xs text-gray-400 truncate">{detalheStr}</p>}
                      <p className="text-xs text-gray-400">{Number(item.produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeItem(item.produto.id)} className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-white"><span className="material-symbols-outlined text-sm">remove</span></button>
                      <span className="text-sm font-bold w-5 text-center text-white">{item.quantidade}</span>
                      <button onClick={() => addItem(item.produto)} className="w-8 h-8 rounded-lg bg-[#e8391a] flex items-center justify-center text-white"><span className="material-symbols-outlined text-sm">add</span></button>
                    </div>
                    <span className="text-sm font-bold w-20 text-right text-white">{(Number(item.produto.preco) * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-[#252830] space-y-3">
          <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="w-full bg-[#16181f] border border-[#252830] rounded-lg py-2.5 px-3 text-sm text-white">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_credito">Cartão Crédito</option>
            <option value="cartao_debito">Cartão Débito</option>
          </select>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Desconto</span>
            <input type="number" value={desconto || ''} onChange={e => setDesconto(Number(e.target.value))} className="w-20 sm:w-24 text-right bg-transparent border-b border-[#252830] text-sm py-0 text-white" />
          </div>
          <div className="flex justify-between pt-2 border-t border-[#252830]">
            <span className="font-bold text-base lg:text-lg text-white">Total</span>
            <span className="text-xl lg:text-2xl font-[Outfit] font-bold text-[#e8391a]">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <button onClick={salvarPedido} disabled={itens.length === 0 || salvando} className={`w-full py-3.5 lg:py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${sucesso ? 'bg-emerald-500 text-white' : 'bg-[#e8391a] text-white'} disabled:opacity-50`}>
            {salvando ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : sucesso ? '✓ Pedido Salvo!' : 'Finalizar Pedido'}
          </button>
          {pedidoMesaSalvo && mesaDosPedido && (
            <button
              onClick={async () => {
                const { data: pedidos } = await supabase
                  .from('pedidos')
                  .select('*')
                  .eq('tenant_id', tenantId)
                  .eq('mesa_numero', mesaDosPedido.numero)
                  .in('status', ['pendente', 'preparando'])
                  .order('created_at', { ascending: false })
                  .limit(1)
                const ultimoPedido = pedidos?.[0]
                if (ultimoPedido) {
                  const { data: itensPedido } = await supabase
                    .from('itens_pedido')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .eq('pedido_id', ultimoPedido.id)
                  setItensMesa(itensPedido || [])
                } else {
                  setItensMesa([])
                }
                setMesaFechar(mesaDosPedido)
                setShowDivisaoConta(true)
              }}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-yellow-500 text-black animate-in fade-in zoom-in duration-300"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Fechar Mesa {mesaDosPedido.numero}
            </button>
          )}
        </div>
      </div>

      {/* Painel Mesas Abertas */}
      {showMesasPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-6" onClick={() => setShowMesasPanel(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-[#252830] shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[#252830] flex justify-between items-center">
              <div>
                <h3 className="font-[Outfit] text-lg sm:text-xl font-bold text-white">Mesas Abertas</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento').length} mesa(s) em uso
                </p>
              </div>
              <button onClick={() => setShowMesasPanel(false)} className="w-8 h-8 rounded-lg bg-[#252830] flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Lista de mesas */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento').length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">table_restaurant</span>
                  <p className="text-sm">Nenhuma mesa aberta</p>
                </div>
              ) : (
                mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento').map(mesa => {
                  const itensDestaMesa = mesasComItens[mesa.id] || []
                  const totalMesa = itensDestaMesa.reduce((sum, item) => sum + (item.total || 0), 0)
                  const expandida = mesaExpandida === mesa.id

                  return (
                    <div key={mesa.id} className="bg-[#252830] rounded-xl border border-[#353840] overflow-hidden">
                      
                      {/* Card header - clicável para expandir */}
                      <button
                        onClick={() => setMesaExpandida(expandida ? null : mesa.id)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#e8391a]/10 border border-[#e8391a]/30 flex items-center justify-center">
                            <span className="text-[#e8391a] font-black text-sm">{mesa.numero}</span>
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">Mesa {mesa.numero}</p>
                            <p className="text-gray-400 text-xs">
                              {mesa.responsavel ? mesa.responsavel : `${mesa.pessoas || 0} pessoa(s)`}
                              {mesa.aberta_em ? ` · ${getTempoOcupada(mesa.aberta_em)}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#e8391a] font-bold text-sm">
                            {totalMesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className="material-symbols-outlined text-gray-400 text-sm transition-transform" style={{ transform: expandida ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            expand_more
                          </span>
                        </div>
                      </button>

                      {/* Conteúdo expandido */}
                      {expandida && (
                        <div className="border-t border-[#353840] p-4 space-y-3">
                          
                          {/* Lista de itens */}
                          <div className="space-y-1.5">
                            {itensDestaMesa.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-2">Nenhum item registrado</p>
                            ) : (
                              itensDestaMesa.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                  <span className="text-gray-300">{item.quantidade}x {item.produto_nome}</span>
                                  <span className="text-gray-400 font-bold">
                                    {Number(item.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Total */}
                          <div className="flex justify-between items-center pt-2 border-t border-[#353840]">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</span>
                            <span className="text-[#e8391a] font-black">
                              {totalMesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>

                          {/* Botão fechar conta */}
                          <button
                            onClick={async () => {
                              setItensMesa(itensDestaMesa)
                              setMesaFechar(mesa)
                              setShowMesasPanel(false)
                              setShowDivisaoConta(true)
                            }}
                            className="w-full py-3 rounded-xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">receipt_long</span>
                            Fechar Conta
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Ocupar Mesa */}
      {showOcuparMesa && mesaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowOcuparMesa(false)}>
          <div className="bg-[#1a1a1a] rounded-3xl p-8 w-full max-w-sm border border-[#252830] shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Outfit] text-2xl font-bold mb-2 text-white">Ocupar Mesa {mesaSelecionada.numero}</h3>
            <p className="text-sm text-gray-400 mb-6">Informe os dados para abrir a comanda</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block">Número de Pessoas</label>
                <input 
                  type="number" 
                  min="1" 
                  max={mesaSelecionada.capacidade}
                  value={pessoasMesa} 
                  onChange={e => setPessoasMesa(Number(e.target.value))}
                  className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block">Nome do Responsável (opcional)</label>
                <input 
                  value={responsavelMesa} 
                  onChange={e => setResponsavelMesa(e.target.value)}
                  placeholder="Ex: João"
                  className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" 
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowOcuparMesa(false)} className="flex-1 py-3 rounded-xl border border-[#252830] text-gray-400 font-bold text-sm hover:text-white">Cancelar</button>
              <button onClick={ocuparMesa} className="flex-1 py-3 rounded-xl bg-[#e8391a] text-white font-bold text-sm">Abrir Comanda</button>
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

      {/* Modal Seleção Tamanho e Sabores - PDV */}
      {showVariacoesModal && produtoSelecionado && precosTamanho[produtoSelecionado.id] && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowVariacoesModal(false)}>
          <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-8 w-full max-w-md border border-[#252830] shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Outfit] text-xl sm:text-2xl font-bold mb-1 text-white">{produtoSelecionado.nome}</h3>
            <p className="text-xs text-gray-400 mb-6">Personalize o produto</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Tamanho</label>
                <div className="grid grid-cols-2 gap-2">
                  {precosTamanho[produtoSelecionado.id].map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => setTamanhoSelecionado(pt.tamanho)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        tamanhoSelecionado === pt.tamanho 
                          ? 'border-[#e8391a] bg-[#e8391a]/10' 
                           : 'border-[#252830] hover:border-gray-700'
                       }`}
                     >
                       <span className="font-bold text-white text-xs">{pt.tamanho}</span>
                       <span className="font-bold text-[#e8391a] text-[10px]">{Number(pt.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Formato</label>
                 <div className="flex bg-[#16181f] rounded-xl p-1">
                   <button 
                     onClick={() => { setTipoPizza('inteiro'); setSabor1(''); setSabor2('') }} 
                     className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoPizza === 'inteiro' ? 'bg-[#e8391a] text-white' : 'text-gray-400'}`}
                   >
                     Inteiro
                   </button>
                   <button 
                     onClick={() => { setTipoPizza('meio-a-meio'); setSabor1(sabores[0]?.nome || ''); setSabor2(sabores[1]?.nome || '') }} 
                     className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoPizza === 'meio-a-meio' ? 'bg-[#e8391a] text-white' : 'text-gray-400'}`}
                   >
                     Meio a Meio
                   </button>
                 </div>
               </div>

               <div className="space-y-3">
                 <div>
                   <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">{tipoPizza === 'inteiro' ? 'Sabor' : '1º Sabor'}</label>
                   <select 
                     value={sabor1} 
                     onChange={(e) => setSabor1(e.target.value)}
                     className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-[#e8391a]"
                   >
                     <option value="">Selecione</option>
                     {sabores.filter(s => s.disponivel).map(s => (
                       <option key={s.id} value={s.nome}>{s.nome}</option>
                     ))}
                   </select>
                 </div>
                 
                 {tipoPizza === 'meio-a-meio' && (
                   <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">2º Sabor</label>
                     <select 
                       value={sabor2} 
                       onChange={(e) => setSabor2(e.target.value)}
                       className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-[#e8391a]"
                     >
                       <option value="">Selecione</option>
                       {sabores.filter(s => s.disponivel).map(s => (
                         <option key={s.id} value={s.nome}>{s.nome}</option>
                       ))}
                     </select>
                   </div>
                 )}
               </div>
             </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowVariacoesModal(false)} className="flex-1 py-3.5 rounded-xl border border-[#252830] text-gray-400 font-bold text-sm">Cancelar</button>
                <button 
                  onClick={() => {
                    // Primeiro tenta pegar o preço do tamanho selecionado
                    const pt = precosTamanho[produtoSelecionado.id]?.find(x => x.tamanho === tamanhoSelecionado)
                    // Se encontrou preço do tamanho, usa; senão usa o preço do produto
                    const preco = pt ? Number(pt.preco) : (Number(produtoSelecionado.preco) || 0)
                    addToCart(produtoSelecionado, preco, tamanhoSelecionado, sabor1, sabor2, tipoPizza)
                  }}
                  disabled={(tipoPizza === 'inteiro' && !sabor1 && sabores.length > 0) || (tipoPizza === 'meio-a-meio' && (!sabor1 || !sabor2))}
                  className="flex-1 py-3.5 rounded-xl bg-[#e8391a] text-white font-bold text-sm disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
           </div>
         </div>
       )}
    </div>
  )
}
