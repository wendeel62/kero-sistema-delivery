import { useState, useCallback, useReducer } from 'react'
import type { Produto } from '../pages/CardapioOnlinePage'
import type { Categoria, Mesa, PrecoTamanho, Sabor, ItemPedido } from './usePdv'

// ============================================
// TYPES
// ============================================

export interface PdvState {
  // Data
  produtos: Produto[]
  categorias: Categoria[]
  mesas: Mesa[]
  precosTamanho: Record<string, PrecoTamanho[]>
  sabores: Sabor[]

  // Cart
  itens: ItemPedido[]
  cartPulse: boolean

  // Variations Modal
  produtoSelecionado: Produto | null
  showVariacoesModal: boolean
  tamanhoSelecionado: string
  tipoPizza: 'inteiro' | 'meio-a-meio'
  sabor1: string
  sabor2: string

  // Filters
  filtro: string | null
  busca: string

  // Mesa
  showOcuparMesa: boolean
  mesaSelecionada: Mesa | null
  pessoasMesa: number
  responsavelMesa: string
  showDivisaoConta: boolean
  itensMesa: any[]
  mesaFechar: any
  showMesasPanel: boolean
  mesasComItens: Record<string, any[]>
  mesaExpandida: string | null

  // Order
  tipo: 'balcao' | 'entrega' | 'mesa'
  clienteNome: string
  clienteTelefone: string
  mesaNumero: string
  observacoes: string
  formaPagamento: string
  desconto: number
  enderecoEntrega: string
  salvando: boolean
  sucesso: boolean
  pedidoMesaSalvo: boolean
  mesaDosPedido: Mesa | null
}

export interface PdvActions {
  // Cart actions
  addItem: (p: Produto, precosTamanho: Record<string, PrecoTamanho[]>) => void
  addToCart: (p: Produto, preco: number, tamanho?: string, s1?: string, s2?: string, tipo?: 'inteiro' | 'meio-a-meio') => void
  removeItem: (id: string) => void
  clearCart: () => void

  // Variations Modal actions
  setShowVariacoesModal: (show: boolean) => void
  setTamanhoSelecionado: (tamanho: string) => void
  setTipoPizza: (tipo: 'inteiro' | 'meio-a-meio') => void
  setSabor1: (sabor: string) => void
  setSabor2: (sabor: string) => void

  // Filters actions
  setFiltro: (filtro: string | null) => void
  setBusca: (busca: string) => void

  // Mesa actions
  setShowOcuparMesa: (show: boolean) => void
  setMesaSelecionada: (mesa: Mesa | null) => void
  setPessoasMesa: (pessoas: number) => void
  setResponsavelMesa: (responsavel: string) => void
  setShowDivisaoConta: (show: boolean) => void
  setMesaFechar: (mesa: any) => void
  setShowMesasPanel: (show: boolean) => void
  setMesaExpandida: (mesaId: string | null) => void
  setItensMesa: (itens: any[]) => void

  // Order actions
  setTipo: (tipo: 'balcao' | 'entrega' | 'mesa') => void
  setClienteNome: (nome: string) => void
  setClienteTelefone: (telefone: string) => void
  setMesaNumero: (mesa: string) => void
  setObservacoes: (obs: string) => void
  setFormaPagamento: (forma: string) => void
  setDesconto: (desconto: number) => void
  setEnderecoEntrega: (endereco: string) => void
  setSucesso: (sucesso: boolean) => void
  setPedidoMesaSalvo: (salvo: boolean) => void
  setMesaDosPedido: (mesa: Mesa | null) => void

  // Data actions
  setProdutos: (produtos: Produto[]) => void
  setCategorias: (categorias: Categoria[]) => void
  setMesas: (mesas: Mesa[]) => void
  setPrecosTamanho: (precos: Record<string, PrecoTamanho[]>) => void
  setSabores: (sabores: Sabor[]) => void
}

// ============================================
// HOOK
// ============================================

export function usePdvState() {
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
  const [showVariacoesModal, setShowVariacoesModalState] = useState(false)
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

  // ----- Cart Actions -----
  const addItem = useCallback((p: Produto, precosTamanho: Record<string, PrecoTamanho[]>) => {
    const variants = precosTamanho[p.id]
    if ((variants && variants.length > 0) || !p.preco || Number(p.preco) === 0) {
      setProdutoSelecionado(p)
      setTamanhoSelecionado(variants?.[0]?.tamanho || '')
      setTipoPizza('inteiro')
      setSabor1('')
      setSabor2('')
      setShowVariacoesModalState(true)
      return
    }
    addToCart(p, Number(p.preco))
  }, [])

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
    setShowVariacoesModalState(false)
    setProdutoSelecionado(null)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: i.quantidade - 1 } : i).filter(i => i.quantidade > 0))
  }, [])

  const clearCart = useCallback(() => {
    setItens([])
  }, [])

  const setShowVariacoesModal = useCallback((show: boolean) => {
    setShowVariacoesModalState(show)
    if (!show) {
      setProdutoSelecionado(null)
    }
  }, [])

  return {
    // Data
    produtos,
    categorias,
    mesas,
    precosTamanho,
    sabores,
    setProdutos,
    setCategorias,
    setMesas,
    setPrecosTamanho,
    setSabores,

    // Cart
    itens,
    cartPulse,
    addItem,
    addToCart,
    removeItem,
    clearCart,

    // Variations Modal
    produtoSelecionado,
    showVariacoesModal,
    tamanhoSelecionado,
    tipoPizza,
    sabor1,
    sabor2,
    setShowVariacoesModal,
    setTamanhoSelecionado,
    setTipoPizza,
    setSabor1,
    setSabor2,

    // Filters
    filtro,
    busca,
    setFiltro,
    setBusca,

    // Mesa
    showOcuparMesa,
    mesaSelecionada,
    pessoasMesa,
    responsavelMesa,
    showDivisaoConta,
    itensMesa,
    mesaFechar,
    showMesasPanel,
    mesasComItens,
    mesaExpandida,
    setShowOcuparMesa,
    setMesaSelecionada,
    setPessoasMesa,
    setResponsavelMesa,
    setShowDivisaoConta,
    setMesaFechar,
    setShowMesasPanel,
    setMesaExpandida,
    setItensMesa,
    setMesasComItens,

    // Order
    tipo,
    clienteNome,
    clienteTelefone,
    mesaNumero,
    observacoes,
    formaPagamento,
    desconto,
    enderecoEntrega,
    salvando,
    sucesso,
    pedidoMesaSalvo,
    mesaDosPedido,
    setTipo,
    setClienteNome,
    setClienteTelefone,
    setMesaNumero,
    setObservacoes,
    setFormaPagamento,
    setDesconto,
    setEnderecoEntrega,
    setSalvando,
    setSucesso,
    setPedidoMesaSalvo,
    setMesaDosPedido
  }
}
