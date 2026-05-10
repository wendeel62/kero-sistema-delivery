import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { syncCliente } from '../lib/syncCliente'
// Re-export Produto type for components
export type { Produto } from '../pages/CardapioOnlinePage'
import type { Produto } from '../pages/CardapioOnlinePage'

// ============================================
// TYPES
// ============================================

export interface Categoria {
  id: string
  nome: string
}

export interface ItemPedido {
  produto: Produto
  quantidade: number
  observacoes: string
  tamanho?: string
  sabor1?: string
  sabor2?: string
  tipoPizza?: 'inteiro' | 'meio-a-meio'
  adicionais?: string
  pontoCarne?: string
}

export interface Mesa {
  id: string
  numero: number
  capacidade: number
  status: string
  responsavel: string
  pessoas: number
  aberta_em: string
}

export interface PrecoTamanho {
  id: string
  produto_id: string
  tamanho: string
  preco: number
}

export interface Sabor {
  id: string
  nome: string
  descricao: string
  disponivel: boolean
}

// ============================================
// HOOK
// ============================================

export function usePdv() {
  const { user } = useAuth()
  const tenantId = user?.id
  const pedidoAtualRef = useRef<HTMLDivElement>(null)

  // ----- State: Data -----
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [precosTamanho, setPrecosTamanho] = useState<Record<string, PrecoTamanho[]>>({})
  const [sabores, setSabores] = useState<Sabor[]>([])

  // ----- State: Cart -----
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [cartPulse, setCartPulse] = useState(false)

  // ----- State: Variacoes Modal -----
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [showVariacoesModal, setShowVariacoesModal] = useState(false)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>('')
  const [tipoPizza, setTipoPizza] = useState<'inteiro' | 'meio-a-meio'>('inteiro')
  const [sabor1, setSabor1] = useState<string>('')
  const [sabor2, setSabor2] = useState<string>('')

  // ----- State: Filters -----
  const [filtro, setFiltro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  // ----- State: Mesa -----
  const [showOcuparMesa, setShowOcuparMesa] = useState(false)
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [pessoasMesa, setPessoasMesa] = useState(1)
  const [responsavelMesa, setResponsavelMesa] = useState('')
  const [showDivisaoConta, setShowDivisaoConta] = useState(false)
  const [itensMesa, setItensMesa] = useState<any[]>([])
  const [mesaFechar, setMesaFechar] = useState<any>(null)
  const [showMesasPanel, setShowMesasPanel] = useState(false)
  const [mesasComItens, setMesasComItens] = useState<Record<string, any[]>>({})
  const [mesaExpandida, setMesaExpandida] = useState<string | null>(null)

  // ----- State: Order -----
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

  // ----- Data Fetching -----
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
      precos.forEach(p => { if (!grouped[p.produto_id]) grouped[p.produto_id] = []; grouped[p.produto_id].push(p) })
      setPrecosTamanho(grouped)
    }
  }, [tenantId])

  useEffect(() => { fetchData() }, [fetchData])
  useRealtime({
    configs: [
      { table: 'produtos', filter: `tenant_id=eq.${tenantId}`, callback: fetchData },
      { table: 'mesas', filter: `tenant_id=eq.${tenantId}`, callback: fetchData }
    ]
  })

  // ----- Mesa Actions -----
  const ocuparMesa = useCallback(async () => {
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
  }, [mesaSelecionada, responsavelMesa, pessoasMesa, tenantId, fetchData])

  const getTempoOcupada = useCallback((abertaEm: string) => {
    if (!abertaEm) return ''
    const diff = Date.now() - new Date(abertaEm).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}min`
    return `${Math.floor(mins / 60)}h ${mins % 60}min`
  }, [])

  const abrirPainelMesas = useCallback(async () => {
    const mesasOcupadas = mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento')
    const dados: Record<string, any[]> = {}
    await Promise.all(mesasOcupadas.map(async (mesa) => {
      const { data: pedidos } = await supabase.from('pedidos').select('*').eq('tenant_id', tenantId).eq('mesa_numero', mesa.numero).in('status', ['pendente', 'preparando']).order('created_at', { ascending: false }).limit(1)
      const ultimoPedido = pedidos?.[0]
      if (ultimoPedido) {
        const { data: itensPedido } = await supabase.from('itens_pedido').select('*').eq('tenant_id', tenantId).eq('pedido_id', ultimoPedido.id)
        dados[mesa.id] = itensPedido || []
      } else {
        dados[mesa.id] = []
      }
    }))
    setMesasComItens(dados)
    setShowMesasPanel(true)
  }, [mesas, tenantId])

  const loadMesaItens = useCallback(async (mesa: Mesa) => {
    const { data: pedidos } = await supabase.from('pedidos').select('*').eq('tenant_id', tenantId).eq('mesa_numero', mesa.numero).in('status', ['pendente', 'preparando']).order('created_at', { ascending: false }).limit(1)
    const ultimoPedido = pedidos?.[0]
    if (ultimoPedido) {
      const { data: itensPedido } = await supabase.from('itens_pedido').select('*').eq('tenant_id', tenantId).eq('pedido_id', ultimoPedido.id)
      setItensMesa(itensPedido || [])
    } else {
      setItensMesa([])
    }
  }, [tenantId])

  // ----- Cart Actions -----
  const addItem = useCallback((p: Produto) => {
    const variants = precosTamanho[p.id]
    if ((variants && variants.length > 0) || !p.preco || Number(p.preco) === 0) {
      setProdutoSelecionado(p)
      setTamanhoSelecionado(variants?.[0]?.tamanho || '')
      setTipoPizza('inteiro')
      setSabor1('')
      setSabor2('')
      setShowVariacoesModal(true)
      return
    }
    addToCart(p, Number(p.preco))
  }, [precosTamanho])

  const addToCart = useCallback((p: Produto, preco: number, tamanho?: string, s1?: string, s2?: string, tipo?: 'inteiro' | 'meio-a-meio') => {
    setItens(prev => {
      const existing = prev.find(i => i.produto.id === p.id && i.tamanho === tamanho && i.sabor1 === s1 && i.sabor2 === s2)
      if (existing) {
        return prev.map(i => (i.produto.id === p.id && i.tamanho === tamanho && i.sabor1 === s1 && i.sabor2 === s2) ? { ...i, quantidade: i.quantidade + 1 } : i)
      }
      return [...prev, { produto: { ...p, preco }, quantidade: 1, observacoes: '', tamanho, sabor1: s1, sabor2: s2, tipoPizza: tipo }]
    })
    setCartPulse(true)
    setTimeout(() => setCartPulse(false), 300)
    setShowVariacoesModal(false)
    setProdutoSelecionado(null)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: i.quantidade - 1 } : i).filter(i => i.quantidade > 0))
  }, [])

  const subtotal = itens.reduce((sum, i) => sum + Number(i.produto.preco) * i.quantidade, 0)
  const total = Math.max(0, subtotal - desconto)

  // ----- Save Order -----
  const salvarPedido = useCallback(async () => {
    if (itens.length === 0) return
    if (tipo === 'entrega') {
      if (!clienteNome || !clienteTelefone) { alert('Nome e Telefone são obrigatórios para pedidos de entrega!'); return }
      if (!enderecoEntrega) { alert('Endereço de entrega é obrigatório!'); return }
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

    if (errPed) { alert(`Erro ao criar pedido: ${errPed.message}`); setSalvando(false); return }

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
      if (errItems) { alert(`Erro ao salvar itens: ${errItems.message}`); setSalvando(false); return }
    }

    if (clienteNome || clienteTelefone) {
      await syncCliente(clienteNome, clienteTelefone, total)
    }

    setSalvando(false)
    setSucesso(true)
    if (tipo === 'mesa') {
      const mesaEncontrada = mesas.find(m => m.numero === Number(mesaNumero))
      if (mesaEncontrada) { setPedidoMesaSalvo(true); setMesaDosPedido(mesaEncontrada) }
    }
    setTimeout(() => { setSucesso(false); setItens([]); setClienteNome(''); setClienteTelefone(''); setMesaNumero(''); setEnderecoEntrega(''); setObservacoes(''); setDesconto(0) }, 10000)
  }, [itens, tipo, clienteNome, clienteTelefone, enderecoEntrega, tenantId, mesaNumero, subtotal, desconto, total, formaPagamento, observacoes, mesas])

  // ----- Filters -----
  const filteredProdutos = produtos.filter(p => {
    if (filtro && p.categoria_id !== filtro) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'livre': return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
      case 'ocupada': return 'border-[#e8391a]/40 bg-[#e8391a]/10 text-[#e8391a]'
      case 'aguardando_pagamento': return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
      case 'inativa': return 'border-gray-600 bg-gray-600/10 text-gray-400'
      default: return 'border-gray-600 bg-gray-600/10 text-gray-400'
    }
  }, [])

  const onMesaClick = useCallback(async (mesa: Mesa) => {
    setMesaSelecionada(mesa)
    if (mesa.status === 'livre') {
      setShowOcuparMesa(true)
    } else if (mesa.status === 'ocupada' || mesa.status === 'aguardando_pagamento') {
      await loadMesaItens(mesa)
      setMesaFechar(mesa)
      setShowDivisaoConta(true)
    }
  }, [loadMesaItens])

  const onMesaFecharClick = useCallback(async (mesa: Mesa) => {
    await loadMesaItens(mesa)
    setMesaFechar(mesa)
    setShowDivisaoConta(true)
  }, [loadMesaItens])

  return {
    // Refs
    pedidoAtualRef,
    // Data
    produtos, categorias, mesas, precosTamanho, sabores, tenantId,
    // Cart
    itens, cartPulse, addItem, addToCart, removeItem, subtotal, total,
    // Variacoes Modal
    produtoSelecionado, showVariacoesModal, tamanhoSelecionado, tipoPizza, sabor1, sabor2,
    setTamanhoSelecionado, setTipoPizza, setSabor1, setSabor2, setShowVariacoesModal,
    // Filters
    filtro, busca, filteredProdutos, setFiltro, setBusca, getStatusColor,
    // Mesa
    showOcuparMesa, mesaSelecionada, pessoasMesa, responsavelMesa,
    showDivisaoConta, itensMesa, setItensMesa, mesaFechar,
    showMesasPanel, mesasComItens, mesaExpandida,
    setShowOcuparMesa, setMesaSelecionada, setPessoasMesa, setResponsavelMesa,
    setShowDivisaoConta, setMesaFechar, setShowMesasPanel, setMesaExpandida,
    ocuparMesa, getTempoOcupada, abrirPainelMesas, loadMesaItens, onMesaClick, onMesaFecharClick,
    // Order
    tipo, clienteNome, clienteTelefone, mesaNumero, observacoes, formaPagamento,
    desconto, enderecoEntrega, salvando, sucesso, pedidoMesaSalvo, mesaDosPedido,
    setTipo, setClienteNome, setClienteTelefone, setMesaNumero, setObservacoes,
    setFormaPagamento, setDesconto, setEnderecoEntrega,
    salvarPedido, fetchData,
  }
}
