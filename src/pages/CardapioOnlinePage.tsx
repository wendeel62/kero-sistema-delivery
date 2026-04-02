import { useCallback, useEffect, useState } from 'react'
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
interface Config { taxa_entrega: number; pedido_minimo: number; loja_aberta: boolean }
interface SavedCustomer { nome: string; telefone: string; email?: string; endereco?: string; numero?: string; bairro?: string; cidade?: string }

type Step = 'menu' | 'reconhecimento' | 'dados' | 'pagamento'

export default function CardapioOnlinePage() {
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
    const [{ data: cats }, { data: prods }, { data: precos }, { data: configData }, { data: saboresData }] = await Promise.all([
      supabase.from('categorias').select('*').eq('ativo', true).order('ordem'),
      supabase.from('produtos').select('*').eq('disponivel', true).order('ordem'),
      supabase.from('precos_tamanho').select('*'),
      supabase.from('configuracoes').select('*').limit(1).single(),
      supabase.from('sabores').select('*').eq('disponivel', true).order('nome'),
    ])
    if (cats) setCategorias(cats)
    if (prods) setProdutos(prods)
    if (saboresData) setSabores(saboresData)
    if (configData) {
      setConfig({
        taxa_entrega: configData.taxa_entrega || 0,
        pedido_minimo: configData.pedido_minimo || 0,
        loja_aberta: configData.loja_aberta ?? true
      })
    }
    
    if (precos) {
      const grouped: Record<string, PrecoTamanho[]> = {}
      precos.forEach(p => {
        if (!grouped[p.produto_id]) grouped[p.produto_id] = []
        grouped[p.produto_id].push(p)
      })
      setPrecosTamanho(grouped)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  
  useRealtime('produtos', () => fetchData())

  // Tracking de eventos para o funil de vendas
  const trackEvent = useCallback(async (tipo: 'visualizacao' | 'add_carrinho' | 'checkout_iniciado' | 'compra', quantidade: number = 1) => {
    try {
      const { data: configData } = await supabase.from('configuracoes').select('tenant_id').limit(1).single()
      if (configData?.tenant_id) {
        await supabase.from('eventos_jornada').insert({
          tenant_id: configData.tenant_id,
          tipo_evento: tipo,
          quantidade
        })
      }
    } catch { /* ignore tracking errors */ }
  }, [])

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

    const { data: pedidoCriado, error: insertError } = await supabase.from('pedidos_online').insert({
      cliente_nome: nome,
      cliente_telefone: telefone,
      cep, endereco, numero_endereco: numero, complemento, bairro, cidade, estado,
      itens: JSON.stringify(itens),
      subtotal, taxa_entrega: taxaEntrega, total,
      forma_pagamento: formaPagamento,
      observacoes,
    }).select('id').single()

    console.log('Pedido criado:', pedidoCriado, 'Erro:', insertError)

    await syncCliente(nome, telefone, total)

    if (pedidoCriado?.id) {
      console.log('Setting pedidoId:', pedidoCriado.id)
      trackEvent('compra', 1)
      setPedidoId(pedidoCriado.id)
      
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black italic text-primary-container font-[Outfit]">KERO</h1>
          <button onClick={() => setStep(step === 'menu' ? 'dados' : 'menu')} className="relative bg-primary-container text-on-primary-fixed px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">shopping_cart</span>
            {cart.length > 0 && <span className="bg-on-primary-fixed text-primary-container w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold">{cart.reduce((s, i) => s + i.quantidade, 0)}</span>}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stepper */}
        {/* Stepper - não mostrar no menu e reconhecimento */}
        {step !== 'menu' && step !== 'reconhecimento' && (
          <div className="flex items-center gap-4 mb-8">
            {['Carrinho', 'Dados', 'Pagamento'].map((s, i) => {
              const stepMap: Step[] = ['menu', 'dados', 'pagamento']
              const active = stepMap.indexOf(step) >= i
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>{i + 1}</div>
                  <span className={`text-sm font-bold ${active ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>{s}</span>
                  {i < 2 && <div className={`w-8 h-[2px] ${active ? 'bg-primary-container' : 'bg-surface-container-high'}`} />}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  />
                )
              })}
            </div>
            {cart.length > 0 && (
              <div className="sticky bottom-4 mt-8">
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
                  className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(255,86,55,0.4)]"
                >
                  Ver Carrinho ({cart.reduce((s, i) => s + i.quantidade, 0)} itens) — {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  <span className="material-symbols-outlined">arrow_forward</span>
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
          <div className="bg-surface-container-high rounded-3xl p-8 w-full max-w-md border border-outline-variant shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Outfit] text-2xl font-bold mb-2 text-on-surface">{produtoSelecionado.nome}</h3>
            <p className="text-sm text-on-surface-variant mb-4">Selecione o tamanho:</p>
            
            <div className="space-y-2 mb-6">
              {precosTamanho[produtoSelecionado.id].map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => setTamanhoSelecionado(pt.tamanho)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                    tamanhoSelecionado === pt.tamanho 
                      ? 'border-primary-container bg-primary-container/10' 
                      : 'border-outline-variant/10 hover:border-outline-variant/30'
                  }`}
                >
                  <span className="font-bold text-on-surface">{pt.tamanho}</span>
                  <span className="font-bold text-primary">{Number(pt.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </button>
              ))}
            </div>

            {/* Toggle Inteiro / Meio a Meio */}
            <div className="flex bg-surface-container rounded-xl p-1 mb-6">
              <button 
                onClick={() => { setTipoPizza('inteiro'); setSabor1(''); setSabor2('') }} 
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tipoPizza === 'inteiro' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant'}`}
              >
                Inteiro
              </button>
              <button 
                onClick={() => { setTipoPizza('meio-a-meio'); setSabor1(sabores[0]?.nome || ''); setSabor2(sabores[1]?.nome || '') }} 
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tipoPizza === 'meio-a-meio' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant'}`}
              >
                Meio a Meio
              </button>
            </div>

            {/* Seleção de Sabores */}
            {tipoPizza === 'meio-a-meio' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-2 block">1º Sabor</label>
                  <select 
                    value={sabor1} 
                    onChange={(e) => setSabor1(e.target.value)}
                    className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface"
                  >
                    <option value="">Selecione</option>
                    {sabores.filter(s => s.disponivel).map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-2 block">2º Sabor</label>
                  <select 
                    value={sabor2} 
                    onChange={(e) => setSabor2(e.target.value)}
                    className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface"
                  >
                    <option value="">Selecione</option>
                    {sabores.filter(s => s.disponivel).map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {tipoPizza === 'inteiro' && sabores.length > 0 && (
              <div className="mb-6">
                <label className="text-xs font-bold text-on-surface-variant mb-2 block">Sabor</label>
                <select 
                  value={sabor1} 
                  onChange={(e) => setSabor1(e.target.value)}
                  className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface"
                >
                  <option value="">Selecione</option>
                  {sabores.filter(s => s.disponivel).map(s => (
                    <option key={s.id} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Preço Total */}
            {tamanhoSelecionado && (tipoPizza === 'inteiro' ? (sabor1 || sabores.length === 0) : (sabor1 && sabor2)) && (
              <div className="bg-primary-container/20 p-4 rounded-xl mb-6 text-center">
                <span className="text-sm text-on-surface-variant">Total: </span>
                <span className="text-2xl font-bold text-primary">
                  {(() => {
                    const precoTamanho = precosTamanho[produtoSelecionado.id]?.find(pt => pt.tamanho === tamanhoSelecionado)
                    let preco = precoTamanho ? Number(precoTamanho.preco) : 0
                    
                    if (tipoPizza === 'meio-a-meio' && sabor1 && sabor2) {
                      preco = preco 
                    }
                    
                    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  })()}
                </span>
              </div>
            )}

            <button 
              onClick={() => {
                const precoTamanho = precosTamanho[produtoSelecionado.id]?.find(pt => pt.tamanho === tamanhoSelecionado)
                const preco = precoTamanho ? Number(precoTamanho.preco) : 0
                addToCart(produtoSelecionado, preco, tamanhoSelecionado)
              }}
              disabled={(tipoPizza === 'inteiro' && !sabor1 && sabores.length > 0) || (tipoPizza === 'meio-a-meio' && (!sabor1 || !sabor2))}
              className="w-full py-4 rounded-xl bg-primary-container text-on-primary-fixed font-bold text-sm disabled:opacity-50"
            >
              Adicionar ao Carrinho
            </button>

            <button onClick={() => setShowTamanhoModal(false)} className="w-full mt-3 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
