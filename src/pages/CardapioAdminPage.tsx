import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { toast } from 'sonner'

interface Categoria {
  id: string
  nome: string
  descricao?: string
  ordem?: number
}

interface Produto {
  id: string
  nome: string
  descricao?: string
  preco: number
  foto_url?: string
  categoria_id?: string
  disponivel: boolean
  destaque?: boolean
  tempo_preparo?: number
}

interface PrecoTamanho {
  id: string
  produto_id: string
  tamanho: string
  preco: number
}

interface Sabor {
  id: string
  nome: string
  descricao?: string
  disponivel: boolean
}

export default function CardapioAdminPage() {
  const { user } = useAuth()
  const tenantId = user?.id

  // Estados
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [busca, setBusca] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<'categorias' | 'sabores'>('categorias')

  // Dados
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [precosTamanho, setPrecosTamanho] = useState<PrecoTamanho[]>([])

  // Loading states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  // Form states
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [tempoPreparo, setTempoPreparo] = useState('30')
  const [categoriaId, setCategoriaId] = useState('')
  const [disponivel, setDisponivel] = useState(true)
  const [destaque, setDestaque] = useState(false)
  const [fotoUrl, setFotoUrl] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [previewFoto, setPreviewFoto] = useState<string | null>(null)

  // Inline states
  const [novaCategoria, setNovaCategoria] = useState('')
  const [novoTamanho, setNovoTamanho] = useState({ tamanho: '', preco: '' })
  const [novoSabor, setNovoSabor] = useState('')

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!tenantId) return
    
    setLoading(true)
    const [produtosRes, categoriasRes, saboresRes] = await Promise.all([
      supabase.from('produtos').select('*').eq('tenant_id', tenantId).order('nome'),
      supabase.from('categorias').select('*').eq('tenant_id', tenantId).order('nome'),
      supabase.from('sabores').select('*').eq('tenant_id', tenantId).order('nome')
    ])

    if (produtosRes.data) setProdutos(produtosRes.data)
    if (categoriasRes.data) setCategorias(categoriasRes.data)
    if (saboresRes.data) setSabores(saboresRes.data)
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime
  useRealtime('prodidos', () => fetchData())
  useRealtime('categorias', () => fetchData())
  useRealtime('sabores', () => fetchData())

  // Filtragem client-side
  const produtosFiltrados = produtos
    .filter(p => filtroCategoria === 'todos' || p.categoria_id === filtroCategoria)
    .filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))

  // Upload foto
  const uploadFoto = async (produtoId: string): Promise<string | null> => {
    if (!fotoFile) return fotoUrl || null
    
    setUploadingFoto(true)
    const fileExt = fotoFile.name.split('.').pop()
    const fileName = `${produtoId}-${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('produtos')
      .upload(fileName, fotoFile)

    if (error) {
      toast.error('Erro ao fazer upload da foto')
      setUploadingFoto(false)
      return null
    }

    const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(fileName)
    setUploadingFoto(false)
    return urlData.publicUrl
  }

  // Abrir drawer para novo produto
  const abrirNovoProduto = () => {
    setEditingProduto(null)
    setNome('')
    setDescricao('')
    setPreco('')
    setTempoPreparo('30')
    setCategoriaId('')
    setDisponivel(true)
    setDestaque(false)
    setFotoUrl('')
    setFotoFile(null)
    setPreviewFoto(null)
    setPrecosTamanho([])
    setNovaCategoria('')
    setNovoTamanho({ tamanho: '', preco: '' })
    setNovoSabor('')
    setDrawerOpen(true)
  }

  // Abrir drawer para editar produto
  const abrirEditarProduto = async (produto: Produto) => {
    setEditingProduto(produto)
    setNome(produto.nome)
    setDescricao(produto.descricao || '')
    setPreco(produto.preco?.toString() || '')
    setTempoPreparo(produto.tempo_preparo?.toString() || '30')
    setCategoriaId(produto.categoria_id || '')
    setDisponivel(produto.disponivel ?? true)
    setDestaque(produto.destaque ?? false)
    setFotoUrl(produto.foto_url || '')
    setFotoFile(null)
    setPreviewFoto(produto.foto_url || null)
    setNovaCategoria('')
    setNovoTamanho({ tamanho: '', preco: '' })
    setNovoSabor('')

    // Buscar tamanhos
    const { data: tamanhosData } = await supabase
      .from('precos_tamanho')
      .select('*')
      .eq('produto_id', produto.id)
    
    if (tamanhosData) setPrecosTamanho(tamanhosData)
    
    setDrawerOpen(true)
  }

  // Salvar produto
  const salvarProduto = async () => {
    if (!nome.trim()) {
      toast.error('Nome do produto é obrigatório')
      return
    }
    if (!preco || parseFloat(preco) <= 0) {
      toast.error('Preço é obrigatório')
      return
    }

    setSaving(true)
    try {
      let produtoId = editingProduto?.id

      if (editingProduto) {
        // Update
        await supabase.from('produtos').update({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          preco: parseFloat(preco),
          tempo_preparo: parseInt(tempoPreparo) || 30,
          categoria_id: categoriaId || null,
          disponivel: disponivel,
          destaque: destaque,
          foto_url: fotoUrl || null
        }).eq('id', editingProduto.id).eq('tenant_id', tenantId)
      } else {
        // Insert
        const { data, error } = await supabase.from('produtos').insert({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          preco: parseFloat(preco),
          tempo_preparo: parseInt(tempoPreparo) || 30,
          categoria_id: categoriaId || null,
          disponivel: disponivel,
          destaque: destaque,
          tenant_id: tenantId
        }).select().single()

        if (error) throw error
        produtoId = data.id
      }

      // Upload foto se houver
      if (fotoFile && produtoId) {
        const url = await uploadFoto(produtoId)
        if (url) {
          await supabase.from('produtos').update({ foto_url: url }).eq('id', produtoId)
        }
      }

      // Salvar tamanhos
      if (produtoId) {
        // Deletar tamanhos antigos
        await supabase.from('precos_tamanho').delete().eq('produto_id', produtoId)
        
        // Inserir novos tamanhos
        if (precosTamanho.length > 0) {
          await supabase.from('precos_tamanho').insert(
            precosTamanho.map(t => ({
              produto_id: produtoId,
              tamanho: t.tamanho,
              preco: t.preco,
              tenant_id: tenantId
            }))
          )
        }
      }

      toast.success(editingProduto ? 'Produto atualizado!' : 'Produto criado!')
      setDrawerOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  // Deletar produto
  const deletarProduto = async (produto: Produto) => {
    if (!confirm(`Tem certeza que deseja excluir "${produto.nome}"?`)) return

    try {
      // Deletar tamanhos primeiro
      await supabase.from('precos_tamanho').delete().eq('produto_id', produto.id)
      
      // Deletar produto
      await supabase.from('produtos').delete().eq('id', produto.id).eq('tenant_id', tenantId)
      
      toast.success('Produto excluído!')
      fetchData()
    } catch (error) {
      toast.error('Erro ao deletar produto')
    }
  }

  // Inline: Nova categoria
  const criarCategoria = async () => {
    if (!novaCategoria.trim()) return
    
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome: novaCategoria.trim(), tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar categoria')
      return
    }

    setCategorias([...categorias, data])
    setCategoriaId(data.id)
    setNovaCategoria('')
    toast.success('Categoria criada!')
  }

  // Inline: Novo tamanho
  const adicionarTamanho = () => {
    if (!novoTamanho.tamanho.trim() || !novoTamanho.preco) return
    
    setPrecosTamanho([
      ...precosTamanho,
      { id: Date.now().toString(), produto_id: editingProduto?.id || '', tamanho: novoTamanho.tamanho, preco: parseFloat(novoTamanho.preco) }
    ])
    setNovoTamanho({ tamanho: '', preco: '' })
  }

  // Inline: Remover tamanho
  const removerTamanho = (id: string) => {
    setPrecosTamanho(precosTamanho.filter(t => t.id !== id))
  }

  // Inline: Novo sabor
  const criarSabor = async () => {
    if (!novoSabor.trim()) return
    
    const { data, error } = await supabase
      .from('sabores')
      .insert({ nome: novoSabor.trim(), disponivel: true, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar sabor')
      return
    }

    setSabores([...sabores, data])
    setNovoSabor('')
    toast.success('Sabor criado!')
  }

  // Inline: Remover sabor
  const removerSabor = async (saborId: string) => {
    await supabase.from('sabores').delete().eq('id', saborId).eq('tenant_id', tenantId)
    setSabores(sabores.filter(s => s.id !== saborId))
  }

  // Handler foto
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFotoFile(file)
      setPreviewFoto(URL.createObjectURL(file))
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d0f14' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 border-b" style={{ borderColor: '#252830', backgroundColor: '#0d0f14' }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <span className="text-xs font-bold tracking-[0.2em]" style={{ color: '#e8391a' }}>ADMINISTRAÇÃO</span>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Cardápio</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Abas */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#16181f' }}>
              <button
                onClick={() => setAbaAtiva('categorias')}
                className="px-4 py-2 text-sm font-medium rounded-md transition-all"
                style={{ 
                  color: abaAtiva === 'categorias' ? '#dde0ee' : '#666',
                  backgroundColor: abaAtiva === 'categorias' ? '#252830' : 'transparent',
                  borderBottom: abaAtiva === 'categorias' ? '2px solid #e8391a' : 'none'
                }}
              >
                Categorias
              </button>
              <button
                onClick={() => setAbaAtiva('sabores')}
                className="px-4 py-2 text-sm font-medium rounded-md transition-all"
                style={{ 
                  color: abaAtiva === 'sabores' ? '#dde0ee' : '#666',
                  backgroundColor: abaAtiva === 'sabores' ? '#252830' : 'transparent',
                  borderBottom: abaAtiva === 'sabores' ? '2px solid #e8391a' : 'none'
                }}
              >
                Sabores
              </button>
            </div>

            {/* Botão Novo Produto */}
            <button
              onClick={abrirNovoProduto}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#e8391a' }}
            >
              <span className="text-lg">+</span>
              <span>Novo Produto</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Filtros por categoria */}
        <section className="mb-6">
          <label className="text-xs font-medium mb-3 block" style={{ color: '#888' }}>CATEGORIAS</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroCategoria('todos')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{ 
                backgroundColor: filtroCategoria === 'todos' ? '#e8391a' : '#16181f',
                color: filtroCategoria === 'todos' ? '#fff' : '#dde0ee'
              }}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFiltroCategoria(cat.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: filtroCategoria === cat.id ? '#e8391a' : '#16181f',
                  color: filtroCategoria === cat.id ? '#fff' : '#dde0ee'
                }}
              >
                {cat.nome}
              </button>
            ))}
          </div>
        </section>

        {/* Barra de busca */}
        <div className="mb-6">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500"
            style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
          />
        </div>

        {/* Grid de produtos */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square" style={{ backgroundColor: '#252830' }} />
                <div className="p-3" style={{ backgroundColor: '#16181f' }}>
                  <div className="h-4 rounded mb-2" style={{ backgroundColor: '#252830', width: '70%' }} />
                  <div className="h-3 rounded" style={{ backgroundColor: '#252830', width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {produtosFiltrados.map(produto => (
              <div
                key={produto.id}
                className="group rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                style={{ backgroundColor: '#16181f', border: '1px solid #252830' }}
              >
                {/* Foto */}
                <div className="aspect-square relative" style={{ backgroundColor: '#1c1e26' }}>
                  {produto.foto_url ? (
                    <img src={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl" style={{ color: '#252830' }}>🍽️</span>
                    </div>
                  )}
                  
                  {/* Ícone editar */}
                  <button
                    onClick={() => abrirEditarProduto(produto)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: '#252830' }}
                  >
                    <span className="text-sm" style={{ color: '#e8391a' }}>✏️</span>
                  </button>

                  {/* Badge indisponível */}
                  {!produto.disponivel && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-xs font-bold uppercase" style={{ color: '#666' }}>Indisponível</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{produto.nome}</h3>
                      <p className="text-xs truncate" style={{ color: '#888' }}>{produto.descricao || '—'}</p>
                    </div>
                    <button
                      onClick={() => deletarProduto(produto)}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <span className="text-sm" style={{ color: '#666' }}>🗑️</span>
                    </button>
                  </div>
                  <p className="font-bold mt-2" style={{ color: '#e8391a' }}>
                    R$ {produto.preco?.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {produtosFiltrados.length === 0 && !loading && (
          <div className="text-center py-12">
            <p style={{ color: '#666' }}>Nenhum produto encontrado</p>
          </div>
        )}
      </main>

      {/* Drawer Lateral */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60" 
            onClick={() => setDrawerOpen(false)}
          />

          {/* Panel */}
          <div 
            className="absolute right-0 top-0 h-full overflow-y-auto"
            style={{ 
              width: '480px', 
              backgroundColor: '#16181f',
              borderLeft: '1px solid #252830'
            }}
          >
            {/* Header */}
            <div className="sticky top-0 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#252830', backgroundColor: '#16181f' }}>
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#252830' }}
              >
                <span className="text-white">×</span>
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Upload foto */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>FOTO</label>
                <label 
                  className="flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all hover:opacity-80"
                  style={{ 
                    backgroundColor: '#1c1e26', 
                    border: '2px dashed #252830',
                    minHeight: '160px'
                  }}
                >
                  {previewFoto ? (
                    <div className="relative w-full h-full">
                      <img src={previewFoto} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                        <span className="text-white text-sm">Alterar foto</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl mb-2">📷</span>
                      <span className="text-sm" style={{ color: '#666' }}>Adicionar foto</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>
                  NOME DO PRODUTO <span style={{ color: '#e8391a' }}>*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Pizza Margherita"
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500"
                  style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>DESCRIÇÃO</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do produto..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 resize-none"
                  style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                />
              </div>

              {/* Preço e Tempo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>
                    PREÇO (R$) <span style={{ color: '#e8391a' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500"
                    style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>TEMPO (MIN)</label>
                  <input
                    type="number"
                    value={tempoPreparo}
                    onChange={(e) => setTempoPreparo(e.target.value)}
                    placeholder="30"
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500"
                    style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>CATEGORIA</label>
                {!novaCategoria ? (
                  <div className="flex gap-2">
                    <select
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-lg text-white"
                      style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                    >
                      <option value="">Selecione</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setNovaCategoria(' ')}
                      className="px-4 py-2 rounded-lg font-bold text-white"
                      style={{ backgroundColor: '#e8391a' }}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                      placeholder="Nome da categoria"
                      className="flex-1 px-4 py-3 rounded-lg text-white placeholder-gray-500"
                      style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                      onKeyDown={(e) => e.key === 'Enter' && criarCategoria()}
                      autoFocus
                    />
                    <button
                      onClick={criarCategoria}
                      className="px-4 py-2 rounded-lg font-bold text-white"
                      style={{ backgroundColor: '#e8391a' }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setNovaCategoria('')}
                      className="px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#252830' }}
                    >
                      <span style={{ color: '#888' }}>×</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Tamanhos e Preços */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>TAMANHOS E PREÇOS</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={novoTamanho.tamanho}
                    onChange={(e) => setNovoTamanho({ ...novoTamanho, tamanho: e.target.value })}
                    placeholder="Tamanho (ex: Grande)"
                    className="flex-1 px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500"
                    style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={novoTamanho.preco}
                    onChange={(e) => setNovoTamanho({ ...novoTamanho, preco: e.target.value })}
                    placeholder="R$"
                    className="w-20 px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500"
                    style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                  />
                  <button
                    onClick={adicionarTamanho}
                    className="px-4 py-2 rounded-lg font-bold text-black"
                    style={{ backgroundColor: '#f57c24' }}
                  >
                    +
                  </button>
                </div>
                <div className="space-y-2">
                  {precosTamanho.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: '#1c1e26' }}>
                      <span className="text-sm text-white">{t.tamanho}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: '#f57c24' }}>R$ {t.preco.toFixed(2).replace('.', ',')}</span>
                        <button onClick={() => removerTamanho(t.id)} className="text-red-500">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sabores */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>SABORES</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={novoSabor}
                    onChange={(e) => setNovoSabor(e.target.value)}
                    placeholder="Novo sabor"
                    className="flex-1 px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500"
                    style={{ backgroundColor: '#1c1e26', border: '1px solid #252830' }}
                    onKeyDown={(e) => e.key === 'Enter' && criarSabor()}
                  />
                  <button
                    onClick={criarSabor}
                    className="px-4 py-2 rounded-lg font-bold text-black"
                    style={{ backgroundColor: '#4caf50' }}
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sabores.map(s => (
                    <div 
                      key={s.id} 
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm"
                      style={{ backgroundColor: '#1c1e26' }}
                    >
                      <span className="text-white">{s.nome}</span>
                      <button onClick={() => removerSabor(s.id)} className="text-red-500 ml-1">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opções */}
              <div>
                <label className="text-xs font-medium mb-3 block" style={{ color: '#888' }}>OPÇÕES</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disponivel}
                      onChange={(e) => setDisponivel(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-white">Disponível</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={destaque}
                      onChange={(e) => setDestaque(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-white">Destaque</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t flex gap-3" style={{ borderColor: '#252830', backgroundColor: '#16181f' }}>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all"
                style={{ border: '1px solid #252830', color: '#888' }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarProduto}
                disabled={saving || uploadingFoto}
                className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: '#e8391a' }}
              >
                {saving || uploadingFoto ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
