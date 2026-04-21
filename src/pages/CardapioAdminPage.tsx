import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'

// Types
interface Categoria {
  id: string
  nome: string
  emoji?: string
  ordem?: number
  created_at?: string
}

interface Produto {
  id: string
  nome: string
  descricao?: string
  categoria_id?: string
  preco: number
  preco_promocional?: number
  tempo_preparo?: number
  status: 'ativo' | 'inativo' | 'esgotado'
  disponivel: boolean
  imagem_url?: string
  created_at?: string
}

interface ComplementoGrupo {
  id: string
  produto_id: string
  nome: string
  tipo: 'unico' | 'multiplo'
  minimo: number
  maximo: number
}

interface ComplementoItem {
  id: string
  grupo_id: string
  nome: string
  preco_adicional: number
}

// Icons (using Unicode symbols as fallback)
const SearchIcon = () => <span className="text-lg">🔍</span>
const GridIcon = () => <span className="text-lg">▦</span>
const ListIcon = () => <span className="text-lg">☰</span>
const PlusIcon = () => <span className="text-lg font-bold">+</span>
const EditIcon = () => <span className="text-sm">✏️</span>
const TrashIcon = () => <span className="text-sm">🗑️</span>
const ImageIcon = () => <span className="text-4xl">🖼️</span>
const CheckIcon = () => <span className="text-lg">✓</span>

export default function CardapioAdminPage() {
  const { user } = useAuth()
  const tenantId = user?.id

  // Tab state
  const [activeTab, setActiveTab] = useState<'produtos' | 'categorias'>('produtos')

  // Produtos state
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Modals
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'produto' | 'categoria', item: Produto | Categoria } | null>(null)

  // Produto form
  const [produtoForm, setProdutoForm] = useState({
    nome: '',
    descricao: '',
    categoria_id: '',
    preco: '',
    preco_promocional: '',
    tempo_preparo: '30',
    status: 'ativo' as 'ativo' | 'inativo' | 'esgotado',
    disponivel: true,
    tem_promocao: false,
    imagem_url: '',
    imagemFile: null as File | null
  })

  // Categoria form
  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    emoji: '🍽️',
    ordem: 0
  })

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)

    const [produtosRes, categoriasRes] = await Promise.all([
      supabase.from('produtos').select('*').eq('tenant_id', tenantId).order('nome'),
      supabase.from('categorias').select('*').eq('tenant_id', tenantId).order('ordem')
    ])

    if (produtosRes.data) setProdutos(produtosRes.data)
    if (categoriasRes.data) setCategorias(categoriasRes.data)
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime
  useRealtime('produtos', fetchData)
  useRealtime('categorias', fetchData)

  // Filtered produtos
  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchCategoria = filtroCategoria === 'todas' || p.categoria_id === filtroCategoria
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
    return matchBusca && matchCategoria && matchStatus
  })

  // Handlers
  const openNovoProduto = () => {
    setEditingProduto(null)
    setProdutoForm({
      nome: '',
      descricao: '',
      categoria_id: '',
      preco: '',
      preco_promocional: '',
      tempo_preparo: '30',
      status: 'ativo',
      disponivel: true,
      tem_promocao: false,
      imagem_url: '',
      imagemFile: null
    })
    setShowProdutoModal(true)
  }

  const openEditarProduto = (produto: Produto) => {
    setEditingProduto(produto)
    setProdutoForm({
      nome: produto.nome,
      descricao: produto.descricao || '',
      categoria_id: produto.categoria_id || '',
      preco: produto.preco?.toString() || '',
      preco_promocional: produto.preco_promocional?.toString() || '',
      tempo_preparo: produto.tempo_preparo?.toString() || '30',
      status: produto.status || 'ativo',
      disponivel: produto.disponivel ?? true,
      tem_promocao: !!produto.preco_promocional,
      imagem_url: produto.imagem_url || '',
      imagemFile: null
    })
    setShowProdutoModal(true)
  }

  const openNovaCategoria = () => {
    setEditingCategoria(null)
    setCategoriaForm({
      nome: '',
      emoji: '🍽️',
      ordem: categorias.length
    })
    setShowCategoriaModal(true)
  }

  const openEditarCategoria = (categoria: Categoria) => {
    setEditingCategoria(categoria)
    setCategoriaForm({
      nome: categoria.nome,
      emoji: categoria.emoji || '🍽️',
      ordem: categoria.ordem || 0
    })
    setShowCategoriaModal(true)
  }

  const salvarProduto = async () => {
    if (!produtoForm.nome.trim() || !produtoForm.preco) {
      alert('Nome e preço são obrigatórios')
      return
    }

    try {
      let imagemUrl = produtoForm.imagem_url

      // Upload image if new file selected
      if (produtoForm.imagemFile) {
        const fileExt = produtoForm.imagemFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(fileName, produtoForm.imagemFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(fileName)
        imagemUrl = urlData.publicUrl
      }

      const produtoData = {
        nome: produtoForm.nome.trim(),
        descricao: produtoForm.descricao.trim() || null,
        categoria_id: produtoForm.categoria_id || null,
        preco: parseFloat(produtoForm.preco),
        preco_promocional: produtoForm.tem_promocao && produtoForm.preco_promocional ? parseFloat(produtoForm.preco_promocional) : null,
        tempo_preparo: parseInt(produtoForm.tempo_preparo) || 30,
        status: produtoForm.status,
        disponivel: produtoForm.disponivel,
        imagem_url: imagemUrl || null,
        tenant_id: tenantId
      }

      if (editingProduto) {
        await supabase.from('produtos').update(produtoData).eq('id', editingProduto.id)
      } else {
        await supabase.from('produtos').insert(produtoData)
      }

      alert(editingProduto ? 'Produto atualizado!' : 'Produto criado!')
      setShowProdutoModal(false)
      fetchData()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar produto')
    }
  }

  const salvarCategoria = async () => {
    if (!categoriaForm.nome.trim()) {
      alert('Nome da categoria é obrigatório')
      return
    }

    try {
      const categoriaData = {
        nome: categoriaForm.nome.trim(),
        emoji: categoriaForm.emoji,
        ordem: categoriaForm.ordem,
        tenant_id: tenantId
      }

      if (editingCategoria) {
        await supabase.from('categorias').update(categoriaData).eq('id', editingCategoria.id)
      } else {
        await supabase.from('categorias').insert(categoriaData)
      }

      alert(editingCategoria ? 'Categoria atualizada!' : 'Categoria criada!')
      setShowCategoriaModal(false)
      fetchData()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar categoria')
    }
  }

  const toggleDisponibilidade = async (produto: Produto) => {
    await supabase.from('produtos').update({ disponivel: !produto.disponivel }).eq('id', produto.id)
    fetchData()
  }

  const confirmarDelete = async () => {
    if (!deleteConfirm) return

    try {
      if (deleteConfirm.type === 'produto') {
        await supabase.from('produtos').delete().eq('id', deleteConfirm.item.id)
      } else {
        // Desvincular produtos da categoria
        await supabase.from('produtos').update({ categoria_id: null }).eq('categoria_id', deleteConfirm.item.id)
        await supabase.from('categorias').delete().eq('id', deleteConfirm.item.id)
      }
      alert('Excluído com sucesso!')
      setDeleteConfirm(null)
      fetchData()
    } catch (error) {
      alert('Erro ao excluir')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      ativo: 'bg-green-500/20 text-green-400',
      inativo: 'bg-red-500/20 text-red-400',
      esgotado: 'bg-gray-500/20 text-gray-400'
    }
    const labels = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      esgotado: 'Esgotado'
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getCategoriaNome = (categoriaId?: string) => {
    if (!categoriaId) return '-'
    const cat = categorias.find(c => c.id === categoriaId)
    return cat?.nome || '-'
  }

  const getProdutosCountByCategoria = (categoriaId: string) => {
    return produtos.filter(p => p.categoria_id === categoriaId && p.disponivel).length
  }

  // Emojis for category picker
  const emojis = ['🍽️', '🍕', '🍔', '🍟', '🌮', '🍣', '🥗', '🍜', '☕', '🍰', '🍺', '🥤']

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 border-b" style={{ borderColor: '#1E1E2E', backgroundColor: '#0A0A0F' }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-white">Cardápio</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={openNovaCategoria}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: '#1E1E2E', color: '#dde0ee' }}
            >
              + Categoria
            </button>
            <button
              onClick={openNovoProduto}
              className="px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#FF6B2B' }}
            >
              + Novo Produto
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b px-6" style={{ borderColor: '#1E1E2E' }}>
        <div className="flex gap-1 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveTab('produtos')}
            className="px-4 py-3 font-medium transition-all border-b-2"
            style={{ 
              borderColor: activeTab === 'produtos' ? '#FF6B2B' : 'transparent',
              color: activeTab === 'produtos' ? '#FF6B2B' : '#888'
            }}
          >
            Produtos
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className="px-4 py-3 font-medium transition-all border-b-2"
            style={{ 
              borderColor: activeTab === 'categorias' ? '#FF6B2B' : 'transparent',
              color: activeTab === 'categorias' ? '#FF6B2B' : '#888'
            }}
          >
            Categorias
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* ABA PRODUTOS */}
        {activeTab === 'produtos' && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 mb-6">
              {/* Busca */}
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-white placeholder-gray-500"
                  style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
                />
              </div>

              {/* Filtro Categoria */}
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
              >
                <option value="todas">Todas as categorias</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>

              {/* Filtro Status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
              >
                <option value="todos">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="esgotado">Esgotado</option>
              </select>

              {/* View Toggle */}
              <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className="px-3 py-2 transition-all"
                  style={{ backgroundColor: viewMode === 'grid' ? '#FF6B2B' : 'transparent', color: viewMode === 'grid' ? 'white' : '#888' }}
                >
                  ▦
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-3 py-2 transition-all"
                  style={{ backgroundColor: viewMode === 'list' ? '#FF6B2B' : 'transparent', color: viewMode === 'list' ? 'white' : '#888' }}
                >
                  ☰
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-square" style={{ backgroundColor: '#1E1E2E' }} />
                    <div className="p-3" style={{ backgroundColor: '#13131A' }}>
                      <div className="h-4 rounded mb-2" style={{ backgroundColor: '#1E1E2E', width: '70%' }} />
                      <div className="h-3 rounded" style={{ backgroundColor: '#1E1E2E', width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : produtosFiltrados.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-gray-400 mb-4">Nenhum produto encontrado</p>
                <button
                  onClick={openNovoProduto}
                  className="px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: '#FF6B2B' }}
                >
                  Criar primeiro produto
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {produtosFiltrados.map(produto => (
                  <div
                    key={produto.id}
                    className="group rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
                  >
                    {/* Image */}
                    <div className="aspect-square relative" style={{ backgroundColor: '#1E1E2E' }}>
                      {produto.imagem_url ? (
                        <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🍽️</div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(produto.status)}
                      </div>

                      {/* Actions */}
                      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditarProduto(produto)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: '#1E1E2E' }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'produto', item: produto })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: '#1E1E2E' }}
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      {/* Toggle Disponibilidade */}
                      <button
                        onClick={() => toggleDisponibilidade(produto)}
                        className="absolute bottom-2 right-2 w-10 h-5 rounded-full transition-colors"
                        style={{ backgroundColor: produto.disponivel ? '#22c55e' : '#666' }}
                      >
                        <div 
                          className="w-4 h-4 rounded-full bg-white transition-transform"
                          style={{ transform: produto.disponivel ? 'translateX(24px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-white truncate">{produto.nome}</h3>
                      <p className="text-xs text-gray-500 truncate">{getCategoriaNome(produto.categoria_id)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-bold" style={{ color: '#FF6B2B' }}>
                          R$ {produto.preco?.toFixed(2).replace('.', ',')}
                        </span>
                        {produto.preco_promocional && (
                          <span className="text-xs text-gray-500 line-through">
                            R$ {produto.preco_promocional.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#1E1E2E' }}>
                      <th className="text-left p-3 text-xs text-gray-500 font-medium">Produto</th>
                      <th className="text-left p-3 text-xs text-gray-500 font-medium hidden md:table-cell">Categoria</th>
                      <th className="text-left p-3 text-xs text-gray-500 font-medium">Preço</th>
                      <th className="text-left p-3 text-xs text-gray-500 font-medium">Status</th>
                      <th className="text-left p-3 text-xs text-gray-500 font-medium">Disp.</th>
                      <th className="text-right p-3 text-xs text-gray-500 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map(produto => (
                      <tr key={produto.id} className="border-b" style={{ borderColor: '#1E1E2E' }}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#1E1E2E' }}>
                              {produto.imagem_url ? (
                                <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                              )}
                            </div>
                            <span className="text-white font-medium">{produto.nome}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-400 hidden md:table-cell">{getCategoriaNome(produto.categoria_id)}</td>
                        <td className="p-3">
                          <span className="font-bold" style={{ color: '#FF6B2B' }}>
                            R$ {produto.preco?.toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                        <td className="p-3">{getStatusBadge(produto.status)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleDisponibilidade(produto)}
                            className="w-10 h-5 rounded-full transition-colors"
                            style={{ backgroundColor: produto.disponivel ? '#22c55e' : '#666' }}
                          >
                            <div 
                              className="w-4 h-4 rounded-full bg-white transition-transform"
                              style={{ transform: produto.disponivel ? 'translateX(24px)' : 'translateX(2px)' }}
                            />
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditarProduto(produto)} className="p-2 rounded-lg hover:bg-white/10">
                              <EditIcon />
                            </button>
                            <button onClick={() => setDeleteConfirm({ type: 'produto', item: produto })} className="p-2 rounded-lg hover:bg-white/10">
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ABA CATEGORIAS */}
        {activeTab === 'categorias' && (
          <>
            {/* Add new category inline */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Nova categoria..."
                className="flex-1 px-4 py-2 rounded-lg text-white placeholder-gray-500"
                style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    await supabase.from('categorias').insert({
                      nome: e.currentTarget.value.trim(),
                      emoji: '🍽️',
                      ordem: categorias.length,
                      tenant_id: tenantId
                    })
                    e.currentTarget.value = ''
                    fetchData()
                  }
                }}
              />
            </div>

            {/* Categories Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: '#1E1E2E' }} />
                ))}
              </div>
            ) : categorias.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📂</div>
                <p className="text-gray-400 mb-4">Nenhuma categoria</p>
                <button
                  onClick={openNovaCategoria}
                  className="px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: '#FF6B2B' }}
                >
                  Criar categoria
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categorias.map(categoria => (
                  <div
                    key={categoria.id}
                    className="group p-4 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoria.emoji || '🍽️'}</span>
                        <div>
                          <h3 className="font-medium text-white">{categoria.nome}</h3>
                          <p className="text-xs text-gray-500">{getProdutosCountByCategoria(categoria.id)} produtos</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditarCategoria(categoria)}
                          className="p-1.5 rounded-lg hover:bg-white/10"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'categoria', item: categoria })}
                          className="p-1.5 rounded-lg hover:bg-white/10"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL PRODUTO */}
      {showProdutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowProdutoModal(false)} />
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ backgroundColor: '#13131A' }}
          >
            {/* Header */}
            <div className="sticky top-0 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1E1E2E', backgroundColor: '#13131A' }}>
              <h2 className="text-xl font-bold text-white">
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setShowProdutoModal(false)} className="p-2 rounded-lg hover:bg-white/10">
                <span className="text-xl text-gray-400">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna Esquerda - Imagem */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">IMAGEM</label>
                <label 
                  className="flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all hover:opacity-80"
                  style={{ 
                    backgroundColor: '#1E1E2E', 
                    minHeight: '200px',
                    border: '2px dashed #333'
                  }}
                >
                  {produtoForm.imagem_url || produtoForm.imagemFile ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={produtoForm.imagemFile ? URL.createObjectURL(produtoForm.imagemFile) : produtoForm.imagem_url} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-xl" 
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                        <span className="text-white text-sm">Alterar imagem</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ImageIcon />
                      <span className="text-gray-500 text-sm mt-2">Adicionar foto</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file && file.size <= 2 * 1024 * 1024) {
                        setProdutoForm({ ...produtoForm, imagemFile: file })
                      } else if (file) {
                        alert('Imagem deve ter no máximo 2MB')
                      }
                    }}
                  />
                </label>
              </div>

              {/* Coluna Direita - Dados */}
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    NOME <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={produtoForm.nome}
                    onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })}
                    placeholder="Ex: Pizza Margherita"
                    className="w-full px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                  />
                </div>

                {/* Descrição */}
                <div>
                  <div className="flex justify-between">
                    <label className="text-xs text-gray-400 mb-1 block">DESCRIÇÃO</label>
                    <span className="text-xs text-gray-500">{produtoForm.descricao.length}/300</span>
                  </div>
                  <textarea
                    value={produtoForm.descricao}
                    onChange={(e) => setProdutoForm({ ...produtoForm, descricao: e.target.value.slice(0, 300) })}
                    placeholder="Descrição do produto..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg text-white resize-none"
                    style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">CATEGORIA</label>
                  <select
                    value={produtoForm.categoria_id}
                    onChange={(e) => setProdutoForm({ ...produtoForm, categoria_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                  >
                    <option value="">Selecione</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Preços */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      PREÇO <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={produtoForm.preco}
                      onChange={(e) => setProdutoForm({ ...produtoForm, preco: e.target.value })}
                      placeholder="0,00"
                      className="w-full px-4 py-2 rounded-lg text-white"
                      style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">TEMPO (MIN)</label>
                    <input
                      type="number"
                      value={produtoForm.tempo_preparo}
                      onChange={(e) => setProdutoForm({ ...produtoForm, tempo_preparo: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg text-white"
                      style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                    />
                  </div>
                </div>

                {/* Toggle Promoção */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={produtoForm.tem_promocao}
                    onChange={(e) => setProdutoForm({ ...produtoForm, tem_promocao: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-400">Tem promoção</span>
                </label>

                {produtoForm.tem_promocao && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">PREÇO PROMOCIONAL</label>
                    <input
                      type="number"
                      step="0.01"
                      value={produtoForm.preco_promocional}
                      onChange={(e) => setProdutoForm({ ...produtoForm, preco_promocional: e.target.value })}
                      placeholder="0,00"
                      className="w-full px-4 py-2 rounded-lg text-white"
                      style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                    />
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">STATUS</label>
                  <div className="flex gap-2">
                    {(['ativo', 'inativo', 'esgotado'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setProdutoForm({ ...produtoForm, status })}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{ 
                          backgroundColor: produtoForm.status === status 
                            ? status === 'ativo' ? '#22c55e' : status === 'inativo' ? '#ef4444' : '#666'
                            : '#1E1E2E',
                          color: produtoForm.status === status ? 'white' : '#888'
                        }}
                      >
                        {status === 'ativo' ? 'Ativo' : status === 'inativo' ? 'Inativo' : 'Esgotado'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disponível */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={produtoForm.disponivel}
                    onChange={(e) => setProdutoForm({ ...produtoForm, disponivel: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-400">Disponível para venda</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t flex gap-3" style={{ borderColor: '#1E1E2E', backgroundColor: '#13131A' }}>
              <button
                onClick={() => setShowProdutoModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ border: '1px solid #333', color: '#888' }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarProduto}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#FF6B2B' }}
              >
                Salvar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIA */}
      {showCategoriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCategoriaModal(false)} />
          <div 
            className="relative w-full max-w-sm rounded-2xl"
            style={{ backgroundColor: '#13131A' }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b" style={{ borderColor: '#1E1E2E' }}>
              <h2 className="text-xl font-bold text-white">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Emoji Picker */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">ÍCONE</label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setCategoriaForm({ ...categoriaForm, emoji })}
                      className="w-10 h-10 rounded-lg text-xl transition-all"
                      style={{ 
                        backgroundColor: categoriaForm.emoji === emoji ? '#FF6B2B' : '#1E1E2E'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  NOME <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={categoriaForm.nome}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                  placeholder="Ex: Pizzas"
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                />
              </div>

              {/* Ordem */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">ORDEM</label>
                <input
                  type="number"
                  value={categoriaForm.ordem}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, ordem: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#1E1E2E', border: '1px solid #333' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: '#1E1E2E' }}>
              <button
                onClick={() => setShowCategoriaModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ border: '1px solid #333', color: '#888' }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarCategoria}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#FF6B2B' }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteConfirm(null)} />
          <div 
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: '#13131A' }}
          >
            <h3 className="text-lg font-bold text-white mb-2">Confirmar exclusão</h3>
            <p className="text-gray-400 mb-6">
              {deleteConfirm.type === 'categoria' 
                ? `${getProdutosCountByCategoria(deleteConfirm.item.id)} produtos serão desvinculados desta categoria. `
                : ''
              }
              Tem certeza que deseja excluir "{deleteConfirm.item.nome}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{ border: '1px solid #333', color: '#888' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDelete}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-red-500"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
