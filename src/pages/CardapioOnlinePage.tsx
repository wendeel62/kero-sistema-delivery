import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { syncCliente } from '../lib/syncCliente'
import NpsWidget from '../components/NpsWidget'
import { useRealtime } from '../hooks/useRealtime'
import ProductCard from '../components/ProductCard'
import CategoryFilters from '../components/CategoryFilters'

export interface Categoria { id: string; nome: string }
export interface Produto { id: string; categoria_id: string; nome: string; descricao: string; preco: number | undefined; disponivel: boolean; imagem_url: string }
interface PrecoTamanho { id: string; produto_id: string; tamanho: string; preco: number }
interface Sabor { id: string; nome: string; descricao: string; disponivel: boolean }
interface CartItem { produto: Produto; quantidade: number; tamanho?: string; precoUnitario: number; tipoPizza?: 'inteiro' | 'meio-a-meio'; sabor1?: string; sabor2?: string }
interface Config { taxa_entrega: number; pedido_minimo: number; loja_aberta: boolean; nome_fantasia?: string; logo_url?: string }
interface SavedCustomer { nome: string; telefone: string; email?: string; endereco?: string; numero?: string; bairro?: string; cidade?: string }

type Step = 'menu' | 'reconhecimento' | 'dados' | 'pagamento'
export default function CardapioOnlinePage() {
  const { slug } = useParams<{ slug: string }>()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [precosTamanho, setPrecosTamanho] = useState<Record<string, PrecoTamanho[]>>({})
  const [config, setConfig] = useState<Config>({ taxa_entrega: 0, pedido_minimo: 0, loja_aberta: true })
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>('')
  const [showTamanhoModal, setShowTamanhoModal] = useState(false)
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [tipoPizza, setTipoPizza] = useState<'inteiro' | 'meio-a-meio'>('inteiro')
  const [sabor1, setSabor1] = useState<string>('')
  const [sabor2, setSabor2] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<Step>('menu')
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [savedCustomer, setSavedCustomer] = useState<SavedCustomer | null>(null)
  const [showDadosResumo, setShowDadosResumo] = useState(false)
  const [veioDeDadosSalvos, setVeioDeDadosSalvos] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

  // Dados do cliente
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cep, setCep] = useState('')
  const [endereco, setEndereco] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [observacoes, setObservacoes] = useState('')

  const fetchData = useCallback(async () => {
    if (!slug || slug === 'undefined' || slug === 'null') {
      console.warn('Slug inválido ou ausente:', slug)
      setLoading(false)
      return
    }

    setLoading(true)
    // console.log('Iniciando busca do cardápio para o slug:', slug)

    try {
      // console.log('Tentando buscar via RPC public.get_public_menu...')
      const { data: menuData, error: rpcError } = await supabase.rpc('get_public_menu', { p_slug: slug })
      
      if (!rpcError && menuData) {
        // console.log('Dados via RPC carregados com sucesso!')
        setTenantId(menuData.tenant_id)
        setCategorias(menuData.categorias || [])
        setProdutos(menuData.produtos || [])
        
        if (menuData.config) {
          setConfig({
            taxa_entrega: menuData.config.taxa_entrega || 0,
            pedido_minimo: menuData.config.pedido_minimo || 0,
            loja_aberta: menuData.config.loja_aberta ?? true,
            nome_fantasia: menuData.config.nome_fantasia,
            logo_url: menuData.config.logo_url
          })
        }
        
        if (menuData.precos_tamanho) {
          const grouped: Record<string, PrecoTamanho[]> = {}
          menuData.precos_tamanho.forEach((p: PrecoTamanho) => {
            if (!grouped[p.produto_id]) grouped[p.produto_id] = []
            grouped[p.produto_id].push(p)
          })
          setPrecosTamanho(grouped)
        }

        if (menuData.sabores) {
          setSabores(menuData.sabores)
        }
        return
      }

      console.warn('RPC indisponível ou falhou. Iniciando busca de fallback (direta)...', rpcError)

      // FALLBACK: Busca direta caso a RPC não exista ou falhe
      const { data: configData, error: configError } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (configError || !configData) {
        console.error('Falha no fallback: Config não encontrada para o slug:', slug, configError)
        return
      }

      const tId = configData.tenant_id
      setTenantId(tId)
      
      setConfig({
        taxa_entrega: configData.taxa_entrega || 0,
        pedido_minimo: configData.pedido_minimo || 0,
        loja_aberta: configData.loja_aberta ?? true,
        nome_fantasia: configData.nome_loja,
        logo_url: configData.logo_url
      })

      // Buscar categorias e produtos em paralelo
      const [catsRes, prodsRes, precosRes, saboresRes] = await Promise.all([
        supabase.from('categorias').select('*').eq('tenant_id', tId).eq('ativo', true).order('ordem'),
        supabase.from('produtos').select('*').eq('tenant_id', tId).eq('disponivel', true).order('ordem'),
        supabase.from('precos_tamanho').select('*').eq('tenant_id', tId),
        supabase.from('sabores').select('*').eq('tenant_id', tId).eq('disponivel', true).order('nome')
      ])

      if (catsRes.data) setCategorias(catsRes.data)
      if (prodsRes.data) setProdutos(prodsRes.data)
      
      if (precosRes.data) {
        const grouped: Record<string, PrecoTamanho[]> = {}
        precosRes.data.forEach((p: PrecoTamanho) => {
          if (!grouped[p.produto_id]) grouped[p.produto_id] = []
          grouped[p.produto_id].push(p)
        })
        setPrecosTamanho(grouped)
      }

      if (saboresRes.data) setSabores(saboresRes.data)
      
      // console.log('Dados via Fallback carregados com sucesso!')

    } catch (e) {
      console.error('Falha catastrófica ao carregar cardápio:', e)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  useRealtime('produtos', () => fetchData())

  // Tracking de eventos para o funil de vendas
  const trackEvent = useCallback(async (tipo: 'visualizacao' | 'add_carrinho' | 'checkout_iniciado' | 'compra', quantidade: number = 1) => {
    try {
      if (tenantId) {
        await supabase.from('eventos_jornada').insert({
          tenant_id: tenantId,
          tipo_evento: tipo,
          quantidade
        })
      }
    } catch { /* ignore tracking errors */ }
  }, [tenantId])

  // Verificar dados salvos no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kero_customer_data')
      if (saved) {
        const data = JSON.parse(saved) as SavedCustomer
        if (data.nome && data.telefone) {
          setSavedCustomer(data)
        }
      }
    } catch {
      // localStorage indisponível, ignorar silenciosamente
    }
  }, [])

  const handleAddToCart = (p: Produto) => {
    const precosProduto = precosTamanho[p.id]
    if (precosProduto && precosProduto.length > 0) {
      setProdutoSelecionado(p)
      setTamanhoSelecionado(precosProduto[0].tamanho)
      setTipoPizza('inteiro')
      setSabor1('')
      setSabor2('')
      setShowTamanhoModal(true)
    } else {
      addToCart(p, p.preco || 0, undefined)
    }
  }

  const addToCart = (p: Produto, preco: number, tamanho?: string) => {
    const tipo = tipoPizza
    const s1 = tipoPizza === 'meio-a-meio' ? sabor1 : (sabor1 || undefined)
    const s2 = tipoPizza === 'meio-a-meio' ? sabor2 : undefined
    
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === p.id && item.tamanho === tamanho && item.tipoPizza === tipo && item.sabor1 === s1 && item.sabor2 === s2)
      if (existing) return prev.map(item => item.produto.id === p.id && item.tamanho === tamanho && item.tipoPizza === tipo && item.sabor1 === s1 && item.sabor2 === s2 ? { ...item, quantidade: item.quantidade + 1 } : item)
      const newCart = [...prev, { produto: p, quantidade: 1, tamanho, precoUnitario: preco, tipoPizza: tipo, sabor1: s1, sabor2: s2 }]
      trackEvent('add_carrinho', 1)
      return newCart
    })
    setShowTamanhoModal(false)
    setProdutoSelecionado(null)
    setTipoPizza('inteiro')
    setSabor1('')
    setSabor2('')
  }

  const removeFromCart = (id: string, tamanho?: string, tipoPizza?: string, sabor1?: string, sabor2?: string) => {
    setCart(prev => prev.map(item => item.produto.id === id && item.tamanho === tamanho && item.tipoPizza === tipoPizza && item.sabor1 === sabor1 && item.sabor2 === sabor2 ? { ...item, quantidade: item.quantidade - 1 } : item).filter(item => item.quantidade > 0))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.precoUnitario || 0) * item.quantidade, 0)
  const taxaEntrega = config.taxa_entrega
  const total = subtotal + taxaEntrega

  const buscarCep = async () => {
    if (cep.length < 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`)
      const data = await res.json()
      if (data.logradouro) {
        setEndereco(data.logradouro)
        setBairro(data.bairro)
        setCidade(data.localidade || data.localicade)
        setEstado(data.uf)
      }
    } catch { /* ignore */ }
  }

  const finalizarPedido = async () => {
    if (!nome || !telefone) return
    setLoading(true)
    const itens = cart.map(item => ({
      produto_id: item.produto.id,
      produto_nome: item.produto.nome + (item.tamanho ? ` (${item.tamanho})` : '') + (item.tipoPizza === 'meio-a-meio' && item.sabor1 && item.sabor2 ? ` - Meio a Meio (${item.sabor1} + ${item.sabor2})` : '') + (item.tipoPizza === 'inteiro' && item.sabor1 ? ` - ${item.sabor1}` : ''),
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
      total: item.precoUnitario * item.quantidade,
      tamanho: item.tamanho,
    }))

    const { data: pedidoIdResult, error: insertError } = await supabase.rpc('submit_public_order', {
      p_order_data: {
        tenant_id: tenantId,
        cliente_nome: nome,
        cliente_telefone: telefone,
        cep, endereco, numero_endereco: numero, complemento, bairro, cidade, estado,
        itens: JSON.stringify(itens),
        subtotal, taxa_entrega: taxaEntrega, total,
        forma_pagamento: formaPagamento,
        observacoes,
      }
    })

    // console.log('Pedido criado:', pedidoIdResult, 'Erro:', insertError)

    await syncCliente(nome, telefone, total)

    if (pedidoIdResult) {
      // console.log('Setting pedidoId:', pedidoIdResult)
      trackEvent('compra', 1)
      setPedidoId(pedidoIdResult)
      
      // Salvar dados do cliente no localStorage após pedido confirmado
      try {
        const customerData: SavedCustomer = {
          nome,
          telefone,
          endereco: endereco || undefined,
          numero: numero || undefined,
          bairro: bairro || undefined,
          cidade: cidade || undefined,
        }
        localStorage.setItem('kero_customer_data', JSON.stringify(customerData))
      } catch {
        // localStorage indisponível, ignorar silenciosamente
      }
    }

    setLoading(false)
    setSucesso(true)
    setCart([])
  }

  const filteredProdutos = produtos.filter(p => {
    if (filtroCategoria && p.categoria_id !== filtroCategoria) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#e8391a] border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant font-bold text-xs uppercase tracking-widest animate-pulse">Carregando Cardápio...</p>
        </div>
      </div>
    )
  }

  if (!tenantId && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full animate-fade-in">
          <span className="material-symbols-outlined text-[#e8391a] text-6xl mb-4">error</span>
          <h2 className="text-3xl font-[Outfit] font-bold text-on-surface mb-2">Ops! Link Inválido</h2>
          <p className="text-on-surface-variant mb-8">Não conseguimos encontrar o cardápio que você está procurando. Verifique se o link está correto.</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="bg-surface-container border border-outline-variant/20 text-on-surface px-8 py-3 rounded-xl font-bold"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center animate-fade-in max-w-md w-full">
          <span className="material-symbols-outlined text-green-400 text-6xl mb-4 block">check_circle</span>
          <h2 className="text-3xl font-[Outfit] font-bold text-on-surface mb-2">Pedido Enviado!</h2>
          <p className="text-on-surface-variant mb-6">Seu pedido foi recebido e está sendo preparado.</p>
          
          {pedidoId && (
            <div className="mb-6">
              <NpsWidget 
                pedidoId={pedidoId} 
                titulo="Como foi sua experiência?"
                variant="cardapio"
                tabela="pedidos_online"
              />
            </div>
          )}
          
          <button onClick={() => { setSucesso(false); setStep('menu'); setPedidoId(null) }} className="bg-primary-container text-on-primary-fixed px-8 py-3 rounded-xl font-bold">Novo Pedido</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#16181f]/80 backdrop-blur-md border-b border-[#252830] px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {config.logo_url && <img src={config.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover" />}
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black italic text-[#e8391a] font-[Outfit] leading-none uppercase">{config.nome_fantasia || 'KERO'}</h1>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{config.nome_fantasia ? 'Cardápio Online' : 'Delivery Online'}</span>
            </div>
          </div>
          <button onClick={() => setStep(step === 'menu' ? 'dados' : 'menu')} className="relative bg-[#e8391a] text-white p-2.5 sm:px-5 sm:py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#e8391a]/20 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-lg sm:text-xl">shopping_basket</span>
            <span className="hidden sm:inline">Carrinho</span>
            {cart.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-white text-[#e8391a] w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black shadow-md">{cart.reduce((s, i) => s + i.quantidade, 0)}</span>}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 sm:pb-8">
        {/* Stepper */}
        {/* Stepper */}
        {step !== 'menu' && step !== 'reconhecimento' && (
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto no-scrollbar pb-2">
            {['Cesto', 'Dados', 'Pagar'].map((s, i) => {
              const stepMap: Step[] = ['menu', 'dados', 'pagamento']
              const active = stepMap.indexOf(step) >= i
              return (
                <div key={s} className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black ${active ? 'bg-[#e8391a] text-white shadow-lg shadow-[#e8391a]/30' : 'bg-[#252830] text-gray-500'}`}>{i + 1}</div>
                  <span className={`text-[11px] sm:text-sm font-bold ${active ? 'text-white' : 'text-gray-600'}`}>{s}</span>
                  {i < 2 && <div className={`w-4 sm:w-8 h-[1px] ${active ? 'bg-[#e8391a]/50' : 'bg-[#252830]'}`} />}
                </div>
              )
            })}
          </div>
        )}

        {/* Step 1: Menu */}
        {step === 'menu' && (
          <div className="animate-fade-in">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no cardápio..." className="w-full bg-surface-container border border-outline-variant/10 rounded-xl py-3 px-5 text-sm text-on-surface mb-6 placeholder:text-on-surface-variant/40" />
            <CategoryFilters 
              categorias={categorias} 
              filtroAtivo={filtroCategoria} 
              onSetFiltro={setFiltroCategoria} 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredProdutos.map(p => {
                const preco = precosTamanho[p.id]?.length 
                  ? Math.min(...precosTamanho[p.id].map(t => Number(t.preco)))
                  : p.preco
                return (
                  <ProductCard 
                    key={p.id}
                    produto={p}
                    preco={preco}
                    onAddToCart={handleAddToCart}
                    onImageClick={url => setSelectedImageUrl(url)}
                  />
                )
              })}
            </div>
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[#16181f] via-[#16181f]/95 to-transparent z-[60] lg:sticky lg:bottom-4 lg:bg-none">
                <button 
                  onClick={() => {
                    if (savedCustomer) {
                      trackEvent('checkout_iniciado', 1)
                      setStep('reconhecimento')
                    } else {
                      trackEvent('checkout_iniciado', 1)
                      setStep('dados')
                    }
                  }} 
                  className="w-full max-w-lg mx-auto bg-[#e8391a] text-white py-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-3 shadow-[0_10_40px_-5px_rgba(232,57,26,0.5)] active:scale-95 transition-all animate-in slide-in-from-bottom-5 duration-500"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg sm:text-xl">shopping_basket</span>
                    <span>VER CARRINHO ({cart.reduce((s, i) => s + i.quantidade, 0)})</span>
                  </div>
                  <div className="w-[1px] h-4 bg-white/20" />
                  <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step Reconhecimento: Cliente salvo */}
        {step === 'reconhecimento' && savedCustomer && (
          <div className="animate-fade-in max-w-lg mx-auto text-center">
            <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-primary">{savedCustomer.nome[0].toUpperCase()}</span>
              </div>
              
              {/* Nome e telefone */}
              <h3 className="text-xl font-bold text-on-surface mb-1">{savedCustomer.nome}</h3>
              <p className="text-sm text-on-surface-variant mb-4">{savedCustomer.telefone}</p>
              
              {/* Endereço resumido */}
              {(savedCustomer.bairro || savedCustomer.numero) && (
                <div className="flex items-center justify-center gap-1 text-xs text-on-surface-variant mb-6">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>
                    {savedCustomer.bairro && savedCustomer.numero 
                      ? `${savedCustomer.bairro}, ${savedCustomer.numero}`
                      : savedCustomer.bairro || savedCustomer.numero}
                  </span>
                </div>
              )}

              {/* Botões */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    // Preencher dados e ir direto para pagamento
                    setNome(savedCustomer.nome)
                    setTelefone(savedCustomer.telefone)
                    if (savedCustomer.endereco) setEndereco(savedCustomer.endereco)
                    if (savedCustomer.numero) setNumero(savedCustomer.numero)
                    if (savedCustomer.bairro) setBairro(savedCustomer.bairro)
                    if (savedCustomer.cidade) setCidade(savedCustomer.cidade)
                    setVeioDeDadosSalvos(true)
                    setStep('pagamento')
                  }}
                  className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Continuar como {savedCustomer.nome.split(' ')[0]}
                </button>
                
                <button 
                  onClick={() => {
                    // Limpar localStorage e ir para dados
                    try {
                      localStorage.removeItem('kero_customer_data')
                    } catch {
                      // Ignorar erro
                    }
                    trackEvent('checkout_iniciado', 1)
                    setSavedCustomer(null)
                    setVeioDeDadosSalvos(false)
                    setStep('dados')
                  }}
                  className="w-full py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-all"
                >
                  Não sou eu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Dados do cliente */}
        {step === 'dados' && (
          <div className="animate-fade-in max-w-lg mx-auto">
            <h3 className="font-[Outfit] text-2xl font-bold mb-6">Seus Dados</h3>
            <div className="space-y-4">
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface" required />
              <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="WhatsApp (11) 99999-9999" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface" required />
              <div className="flex gap-3">
                <input value={cep} onChange={e => setCep(e.target.value)} onBlur={buscarCep} placeholder="CEP (opcional)" className="w-40 bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface" />
                <button onClick={buscarCep} className="bg-surface-container-high px-4 rounded-xl text-xs font-bold text-on-surface-variant">Buscar</button>
              </div>
              <input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface" />
              <div className="grid grid-cols-2 gap-3">
                <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Número" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface" />
                <input value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Complemento" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface" />
              </div>
              <input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface" />
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações do pedido" rows={3} className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface resize-none" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep('menu')} className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm">Voltar</button>
              <button onClick={() => setStep('pagamento')} disabled={!nome || !telefone} className="flex-1 py-3 rounded-xl bg-primary-container text-on-primary-fixed font-bold text-sm disabled:opacity-50">Continuar</button>
            </div>
          </div>
        )}

        {/* Step 3: Pagamento */}
        {step === 'pagamento' && (
          <div className="animate-fade-in max-w-lg mx-auto">
            <h3 className="font-[Outfit] text-2xl font-bold mb-6">Forma de Pagamento</h3>
            
            {/* Resumo colapsável dos dados do cliente - apenas quando veio de dados salvos */}
            {veioDeDadosSalvos && (
              <div className="bg-surface-container rounded-xl mb-6 border border-outline-variant/10 overflow-hidden">
                <button 
                  onClick={() => setShowDadosResumo(!showDadosResumo)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">person</span>
                    <span className="text-sm font-bold text-on-surface">Seus dados</span>
                  </div>
                  <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${showDadosResumo ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                
                {showDadosResumo && (
                  <div className="px-4 pb-4 space-y-2 animate-fade-in">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Nome</span>
                      <span className="text-on-surface font-medium">{nome}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Telefone</span>
                      <span className="text-on-surface font-medium">{telefone}</span>
                    </div>
                    {(endereco || bairro) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Endereço</span>
                        <span className="text-on-surface font-medium text-right max-w-[200px] truncate">
                          {[endereco, numero, bairro].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        trackEvent('checkout_iniciado', 1)
                        setStep('dados')
                        setShowDadosResumo(false)
                      }}
                      className="text-primary text-xs font-bold mt-2 hover:underline"
                    >
                      Editar dados
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Resumo do pedido */}
            <div className="bg-surface-container rounded-xl p-6 mb-6 border border-outline-variant/10">
              {cart.map(item => (
                <div key={item.produto.id + item.tamanho} className="flex justify-between py-2 border-b border-outline-variant/5 last:border-0">
                  <span className="text-sm">
                    {item.quantidade}x {item.produto.nome}{item.tamanho ? ` (${item.tamanho})` : ''}
                    {item.tipoPizza === 'meio-a-meio' && item.sabor1 && item.sabor2 ? ` - Meio a Meio (${item.sabor1} + ${item.sabor2})` : ''}
                    {item.tipoPizza === 'inteiro' && item.sabor1 ? ` - ${item.sabor1}` : ''}
                  </span>
                  <span className="text-sm font-bold">{(item.precoUnitario * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-3 border-t border-outline-variant/10">
                <span className="text-xs text-on-surface-variant">Subtotal</span>
                <span className="text-sm">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-on-surface-variant">Entrega</span>
                <span className="text-sm">{taxaEntrega.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between pt-3 mt-3 border-t border-outline-variant/10">
                <span className="font-bold">Total</span>
                <span className="text-xl font-[Outfit] font-bold text-primary">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { value: 'pix', label: 'PIX', icon: 'qr_code' },
                { value: 'cartao', label: 'Cartão', icon: 'credit_card' },
                { value: 'dinheiro', label: 'Dinheiro', icon: 'payments' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setFormaPagamento(opt.value)} className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${formaPagamento === opt.value ? 'border-primary-container bg-primary-container/10' : 'border-outline-variant/10 hover:border-outline-variant/30'}`}>
                  <span className="material-symbols-outlined">{opt.icon}</span>
                  <span className="font-bold text-sm">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (veioDeDadosSalvos) {
                    setStep('reconhecimento')
                  } else {
                    setStep('dados')
                  }
                }} 
                className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm"
              >
                Voltar
              </button>
              <button onClick={finalizarPedido} disabled={loading} className="flex-1 py-4 rounded-xl bg-primary-container text-on-primary-fixed font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin" /> : 'Finalizar Pedido'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Seleção Tamanho e Sabores */}
      {showTamanhoModal && produtoSelecionado && precosTamanho[produtoSelecionado.id] && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowTamanhoModal(false)}>
          <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-8 w-full max-w-md border border-[#252830] shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-[Outfit] text-2xl font-black text-white italic tracking-tighter">{produtoSelecionado.nome}</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Personalize seu pedido</p>
              </div>
              <button 
                onClick={() => setShowTamanhoModal(false)}
                className="w-10 h-10 rounded-xl bg-[#252830] text-gray-400 flex items-center justify-center active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3 mb-8">
              <label className="text-[10px] font-black text-[#e8391a] uppercase tracking-widest ml-1">Selecione o tamanho</label>
              <div className="grid grid-cols-1 gap-2">
                {precosTamanho[produtoSelecionado.id].map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setTamanhoSelecionado(pt.tamanho)}
                    className={`group w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      tamanhoSelecionado === pt.tamanho 
                        ? 'border-[#e8391a] bg-[#e8391a]/5' 
                        : 'border-[#252830] hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${tamanhoSelecionado === pt.tamanho ? 'border-[#e8391a]' : 'border-gray-600'}`}>
                        {tamanhoSelecionado === pt.tamanho && <div className="w-2.5 h-2.5 rounded-full bg-[#e8391a]" />}
                      </div>
                      <span className={`font-bold ${tamanhoSelecionado === pt.tamanho ? 'text-white' : 'text-gray-400'}`}>{pt.tamanho}</span>
                    </div>
                    <span className="font-black text-[#e8391a]">{Number(pt.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Inteiro / Meio a Meio */}
            <div className="flex bg-[#252830] rounded-2xl p-1.5 mb-8">
              <button 
                onClick={() => { setTipoPizza('inteiro'); setSabor1(''); setSabor2('') }} 
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tipoPizza === 'inteiro' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Inteiro
              </button>
              <button 
                onClick={() => { setTipoPizza('meio-a-meio'); setSabor1(sabores[0]?.nome || ''); setSabor2(sabores[1]?.nome || '') }} 
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tipoPizza === 'meio-a-meio' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                2 Sabores
              </button>
            </div>

            {/* Seleção de Sabores */}
            {tipoPizza === 'meio-a-meio' && (
              <div className="space-y-4 mb-8 bg-[#16181f] p-4 rounded-2xl border border-[#252830]">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">1º Sabor</label>
                  <select 
                    value={sabor1} 
                    onChange={(e) => setSabor1(e.target.value)}
                    className="w-full bg-[#252830] border-none focus:ring-2 focus:ring-[#e8391a] rounded-xl py-3 px-4 text-sm text-white font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {sabores.filter(s => s.disponivel).map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">2º Sabor</label>
                  <select 
                    value={sabor2} 
                    onChange={(e) => setSabor2(e.target.value)}
                    className="w-full bg-[#252830] border-none focus:ring-2 focus:ring-[#e8391a] rounded-xl py-3 px-4 text-sm text-white font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {sabores.filter(s => s.disponivel).map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {tipoPizza === 'inteiro' && sabores.length > 0 && (
              <div className="mb-8">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Observação de Sabor</label>
                <select 
                  value={sabor1} 
                  onChange={(e) => setSabor1(e.target.value)}
                  className="w-full bg-[#252830] border-none focus:ring-2 focus:ring-[#e8391a] rounded-xl py-3 px-4 text-sm text-white font-bold appearance-none cursor-pointer"
                >
                  <option value="">Opcional: Selecione...</option>
                  {sabores.filter(s => s.disponivel).map(s => (
                    <option key={s.id} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Preço Total */}
            {tamanhoSelecionado && (tipoPizza === 'inteiro' ? true : (sabor1 && sabor2)) && (
              <div className="bg-[#e8391a] p-5 rounded-2xl mb-4 text-center shadow-[0_10px_40px_-5px_rgba(232,57,26,0.5)]">
                <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Valor Total</div>
                <div className="text-3xl font-black text-white italic tracking-tighter">
                  {(() => {
                    const precoTamanho = precosTamanho[produtoSelecionado.id]?.find(pt => pt.tamanho === tamanhoSelecionado)
                    const preco = precoTamanho ? Number(precoTamanho.preco) : 0
                    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  })()}
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                const precoTamanho = precosTamanho[produtoSelecionado.id]?.find(pt => pt.tamanho === tamanhoSelecionado)
                const preco = precoTamanho ? Number(precoTamanho.preco) : 0
                addToCart(produtoSelecionado, preco, tamanhoSelecionado)
              }}
              disabled={(tipoPizza === 'meio-a-meio' && (!sabor1 || !sabor2))}
              className="w-full py-5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-30 active:scale-95 transition-all"
            >
              Confirmar e Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Modal Zoom Foto (Stories Style) */}
      {selectedImageUrl && (
        <div 
          className="fixed inset-0 z-[200] bg-black animate-in fade-in zoom-in duration-300 flex flex-col items-center justify-center overflow-hidden"
          onClick={() => setSelectedImageUrl(null)}
        >
          {/* Header com botão fechar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 bg-[#e8391a] rounded-full" />
              <div className="flex flex-col">
                <span className="text-white font-black text-xl italic tracking-tighter leading-none">KERO VISUAL</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Alta Qualidade</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedImageUrl(null)}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-2xl font-bold">close</span>
            </button>
          </div>

          {/* Imagem Central */}
          <div className="w-full h-full p-2 sm:p-0 flex items-center justify-center">
             <img 
              src={selectedImageUrl || undefined} 
              alt="Produto em destaque"
              className="w-full h-full object-contain sm:object-cover sm:max-w-md sm:max-h-[80vh] sm:rounded-3xl shadow-2xl"
            />
          </div>

          {/* Footer Informativo */}
          <div className="absolute bottom-0 left-0 right-0 p-8 w-full bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4 pb-12 pointer-events-none">
             <div className="flex items-center gap-1 mb-2">
                <div className="w-8 h-1 bg-white/30 rounded-full" />
                <div className="w-8 h-1 bg-white/10 rounded-full" />
                <div className="w-8 h-1 bg-white/10 rounded-full" />
             </div>
             <button 
               onClick={() => setSelectedImageUrl(null)}
               className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs tracking-widest uppercase shadow-2xl pointer-events-auto active:scale-95 transition-all flex items-center gap-2"
             >
               <span className="material-symbols-outlined text-sm">arrow_back</span>
               Voltar para o Cardápio
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
