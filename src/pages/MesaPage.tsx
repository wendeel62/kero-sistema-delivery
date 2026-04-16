import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useParams } from 'react-router-dom'
import type { Produto, Categoria, PrecoTamanho, Sabor, Mesa } from '../types'

interface CartItem { produto: Produto; quantidade: number; tamanho?: string; precoUnitario: number; tipoPizza?: 'inteiro' | 'meio-a-meio'; sabor1?: string; sabor2?: string }

type Step = 'menu' | 'carrinho'

export default function MesaPage() {
  const { numero } = useParams<{ numero: string }>()
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || user?.id
  const [mesa, setMesa] = useState<Mesa | null>(null)
  const [mesaNaoEncontrada, setMesaNaoEncontrada] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [precosTamanho, setPrecosTamanho] = useState<Record<string, PrecoTamanho[]>>({})
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<Step>('menu')
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [notificacao, setNotificacao] = useState('')
  
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>('')
  const [showTamanhoModal, setShowTamanhoModal] = useState(false)
  const [tipoPizza, setTipoPizza] = useState<'inteiro' | 'meio-a-meio'>('inteiro')
  const [sabor1, setSabor1] = useState<string>('')
  const [sabor2, setSabor2] = useState<string>('')

  const fetchData = useCallback(async () => {
    const mesaNum = parseInt(numero || '0')
    const [{ data: mesaData }, { data: cats }, { data: prods }, { data: precos }, { data: saboresData }] = await Promise.all([
      supabase.from('mesas').select('*').eq('tenant_id', tenantId).eq('numero', mesaNum).single(),
      supabase.from('categorias').select('*').eq('tenant_id', tenantId).eq('ativo', true).order('ordem'),
      supabase.from('produtos').select('*').eq('tenant_id', tenantId).eq('disponivel', true).order('ordem'),
      supabase.from('precos_tamanho').select('*').eq('tenant_id', tenantId),
      supabase.from('sabores').select('*').eq('tenant_id', tenantId).eq('disponivel', true).order('nome'),
    ])
    
    if (!mesaData) {
      setMesaNaoEncontrada(true)
      return
    }
    
    setMesa(mesaData)
    if (cats) setCategorias(cats)
    if (prods) setProdutos(prods)
    if (saboresData) setSabores(saboresData)
    
    if (precos) {
      const grouped: Record<string, PrecoTamanho[]> = {}
      precos.forEach(p => {
        if (!grouped[p.produto_id]) grouped[p.produto_id] = []
        grouped[p.produto_id].push(p)
      })
      setPrecosTamanho(grouped)
    }
  }, [numero])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const channel = supabase.channel(`mesa-updates-${tenantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'itens_pedido', filter: `tenant_id=eq.${tenantId}` }, () => {
        setNotificacao('Nova atualização na comanda!')
        setTimeout(() => setNotificacao(''), 5000)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
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
      return [...prev, { produto: p, quantidade: 1, tamanho, precoUnitario: preco, tipoPizza: tipo, sabor1: s1, sabor2: s2 }]
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

  const confirmarPedido = async () => {
    if (!mesa || cart.length === 0) return
    setLoading(true)

    const itens = cart.map(item => ({
      produto_id: item.produto.id,
      produto_nome: item.produto.nome + (item.tamanho ? ` (${item.tamanho})` : '') + (item.tipoPizza === 'meio-a-meio' && item.sabor1 && item.sabor2 ? ` - Meio a Meio (${item.sabor1} + ${item.sabor2})` : '') + (item.tipoPizza === 'inteiro' && item.sabor1 ? ` - ${item.sabor1}` : ''),
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
      total: item.precoUnitario * item.quantidade,
      tamanho: item.tamanho,
    }))

    await supabase.from('itens_pedido').insert(itens.map(i => ({ ...i, tenant_id: tenantId })))

    setLoading(false)
    setSucesso(true)
    setCart([])
    setTimeout(() => {
      setSucesso(false)
      setStep('menu')
    }, 3000)
  }

  const filteredProdutos = produtos.filter(p => {
    if (filtroCategoria && p.categoria_id !== filtroCategoria) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  if (mesaNaoEncontrada) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <span className="material-symbols-outlined text-yellow-400 text-6xl mb-4 block">warning</span>
          <h2 className="text-3xl font-[Outfit] font-bold text-on-surface mb-2">Mesa não encontrada</h2>
          <p className="text-on-surface-variant">Esta mesa não existe ou não está ativa no momento.</p>
          <p className="text-on-surface-variant mt-2">Peça ao atendente para abrir a mesa no sistema.</p>
        </div>
      </div>
    )
  }

  if (!mesa || mesa.status !== 'ocupada') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <span className="material-symbols-outlined text-yellow-400 text-6xl mb-4 block">hourglass_empty</span>
          <h2 className="text-3xl font-[Outfit] font-bold text-on-surface mb-2">Aguarde</h2>
          <p className="text-on-surface-variant">Esta mesa ainda não foi aberta pelo atendente.</p>
          <p className="text-on-surface-variant mt-2">Chame um atendente para abrir a comanda.</p>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <span className="material-symbols-outlined text-green-400 text-6xl mb-4 block">check_circle</span>
          <h2 className="text-3xl font-[Outfit] font-bold text-on-surface mb-2">Pedido Enviado!</h2>
          <p className="text-on-surface-variant">Seu pedido foi adicionado à comanda.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {notificacao && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary-container text-on-primary-fixed px-6 py-3 rounded-xl shadow-lg animate-fade-in">
          {notificacao}
        </div>
      )}
      
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black italic text-primary-container font-[Outfit]">Mesa {mesa.numero}</h1>
            {mesa.responsavel && <p className="text-xs text-on-surface-variant">Responsável: {mesa.responsavel}</p>}
          </div>
          <button onClick={() => setStep(step === 'menu' ? 'carrinho' : 'menu')} className="relative bg-primary-container text-on-primary-fixed px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">shopping_cart</span>
            {cart.length > 0 && <span className="bg-on-primary-fixed text-primary-container w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold">{cart.reduce((s, i) => s + i.quantidade, 0)}</span>}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {step === 'menu' && (
          <div className="animate-fade-in">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no cardápio..." className="w-full bg-surface-container border border-outline-variant/10 rounded-xl py-3 px-5 text-sm text-on-surface mb-6 placeholder:text-on-surface-variant/40" />
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
              <button onClick={() => setFiltroCategoria(null)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!filtroCategoria ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>Tudo</button>
              {categorias.map(c => (
                <button key={c.id} onClick={() => setFiltroCategoria(c.id)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filtroCategoria === c.id ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'}`}>{c.nome}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProdutos.map(p => {
                const inCart = cart.find(i => i.produto.id === p.id)
                return (
                  <div key={p.id} className="bg-surface-container p-5 rounded-xl border border-outline-variant/10 flex gap-4 hover:border-primary-container/20 transition-all">
                    <div className="flex-1">
                      <h4 className="font-[Outfit] font-bold">{p.nome}</h4>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{p.descricao}</p>
                      <p className="text-lg font-[Outfit] font-bold text-primary mt-2">
                        {precosTamanho[p.id]?.length ? 
                          `A partir de R$ ${Math.min(...precosTamanho[p.id].map(t => Number(t.preco))).toFixed(2)}` : 
                          (p.preco ? Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Consulte')}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-end gap-2">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeFromCart(p.id, inCart.tamanho, inCart.tipoPizza, inCart.sabor1, inCart.sabor2)} className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-error/20 transition-all"><span className="material-symbols-outlined text-sm">remove</span></button>
                          <span className="text-sm font-bold w-6 text-center">{inCart.quantidade}</span>
                          <button onClick={() => handleAddToCart(p)} className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-fixed"><span className="material-symbols-outlined text-sm">add</span></button>
                        </div>
                      ) : (
                        <button onClick={() => handleAddToCart(p)} className="bg-primary-container text-on-primary-fixed px-4 py-2 rounded-lg text-xs font-bold">Adicionar</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {step === 'carrinho' && (
          <div className="animate-fade-in max-w-lg mx-auto">
            <h3 className="font-[Outfit] text-2xl font-bold mb-6">Sua Comanda</h3>
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
                <span className="font-bold">Total</span>
                <span className="text-xl font-[Outfit] font-bold text-primary">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('menu')} className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm">Adicionar Mais</button>
              <button onClick={confirmarPedido} disabled={loading || cart.length === 0} className="flex-1 py-4 rounded-xl bg-primary-container text-on-primary-fixed font-bold text-sm disabled:opacity-50">
                {loading ? 'Enviando...' : 'Enviar para Cozinha'}
              </button>
            </div>
          </div>
        )}
      </div>

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
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${tamanhoSelecionado === pt.tamanho ? 'border-primary-container bg-primary-container/10' : 'border-outline-variant/10 hover:border-outline-variant/30'}`}
                >
                  <span className="font-bold text-on-surface">{pt.tamanho}</span>
                  <span className="font-bold text-primary">{Number(pt.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </button>
              ))}
            </div>

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

            {tipoPizza === 'meio-a-meio' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-2 block">1º Sabor</label>
                  <select value={sabor1} onChange={(e) => setSabor1(e.target.value)} className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface">
                    <option value="">Selecione</option>
                    {sabores.filter(s => s.disponivel).map(s => (<option key={s.id} value={s.nome}>{s.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant mb-2 block">2º Sabor</label>
                  <select value={sabor2} onChange={(e) => setSabor2(e.target.value)} className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface">
                    <option value="">Selecione</option>
                    {sabores.filter(s => s.disponivel).map(s => (<option key={s.id} value={s.nome}>{s.nome}</option>))}
                  </select>
                </div>
              </div>
            )}

            {tipoPizza === 'inteiro' && sabores.length > 0 && (
              <div className="mb-6">
                <label className="text-xs font-bold text-on-surface-variant mb-2 block">Sabor</label>
                <select value={sabor1} onChange={(e) => setSabor1(e.target.value)} className="w-full bg-background border-none focus:ring-1 focus:ring-primary-container rounded-xl py-3 px-4 text-sm text-on-surface">
                  <option value="">Selecione</option>
                  {sabores.filter(s => s.disponivel).map(s => (<option key={s.id} value={s.nome}>{s.nome}</option>))}
                </select>
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
              Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
