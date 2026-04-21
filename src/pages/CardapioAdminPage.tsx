import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'

interface Categoria { id: string; nome: string; descricao?: string; ordem: number }
interface Produto { id: string; nome: string; descricao: string; preco: number; categoria_id: string; disponivel: boolean; imagem_url: string; destaque: boolean; tempo_preparo: number }
interface Sabor { id: string; nome: string; descricao: string; disponivel: boolean }

export default function CardapioAdminPage() {
  const { user } = useAuth()
  const tenantId = user?.id

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [editProduto, setEditProduto] = useState<Produto | null>(null)
  const [editCategoria, setEditCategoria] = useState<Categoria | null>(null)
  const [editSabor, setEditSabor] = useState<Sabor | null>(null)
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [showSaborModal, setShowSaborModal] = useState(false)
  const [showTamanhoModal, setShowTamanhoModal] = useState(false) // ainda não usado
  const [novoTamanho, setNovoTamanho] = useState({ tamanho: '', preco: '' })
  const [precosTamanho, setPrecosTamanho] = useState<{id?: string, tamanho: string, preco: number}[]>([])
  const [novaCategoriaInline, setNovaCategoriaInline] = useState('')
  const [novoSaborInline, setNovoSaborInline] = useState('')
  const [loadingTamanhos, setLoadingTamanhos] = useState(false)

  const uploadPhoto = async (produtoId: string) => {
    if (!selectedFile) return null
    setUploading(true)
    const fileExt = selectedFile.name.split('.').pop()
    const fileName = `${produtoId}-${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage.from('produtos').upload(fileName, selectedFile)
    if (error) {
      alert('Erro ao fazer upload: ' + error.message)
      setUploading(false)
      return null
    }
    const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(fileName)
    setUploading(false)
    return urlData.publicUrl
  }

  const fetchProdutos = useCallback(async () => {
    const [{ data: prods }, { data: cats }, { data: saborData }] = await Promise.all([
      supabase.from('produtos').select('*').eq('tenant_id', tenantId).order('ordem'),
      supabase.from('categorias').select('*').eq('tenant_id', tenantId).order('ordem'),
      supabase.from('sabores').select('*').eq('tenant_id', tenantId).order('nome'),
    ])
    if (prods) setProdutos(prods)
    if (cats) setCategorias(cats)
    if (saborData) setSabores(saborData)
  }, [tenantId])

  useEffect(() => { fetchProdutos() }, [fetchProdutos])

  // Carregar tamanhos do produto quando abrir o modal
  useEffect(() => {
    const fetchTamanhos = async () => {
      if (editProduto?.id) {
        setLoadingTamanhos(true)
        const { data } = await supabase.from('precos_tamanho').select('*').eq('produto_id', editProduto.id)
        if (data) setPrecosTamanho(data)
        setLoadingTamanhos(false)
      } else {
        setPrecosTamanho([])
      }
    }
    fetchTamanhos()
  }, [editProduto?.id, showProdutoModal])

  const produtoForm = useForm<Produto>({ defaultValues: editProduto || { nome: '', descricao: '', preco: 0, categoria_id: '', disponivel: true, imagem_url: '', destaque: false, tempo_preparo: 30 } })

  const categoriaForm = useForm<Categoria>({ defaultValues: editCategoria || { nome: '', descricao: '', ordem: 0 } })
  const saborForm = useForm<Sabor>({ defaultValues: editSabor || { nome: '', descricao: '', disponivel: true } })

  useEffect(() => {
    if (editProduto) produtoForm.reset(editProduto)
  }, [editProduto, produtoForm])

  useEffect(() => {
    if (editCategoria) categoriaForm.reset(editCategoria)
  }, [editCategoria, categoriaForm])

  useEffect(() => {
    if (editSabor) saborForm.reset(editSabor)
  }, [editSabor, saborForm])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const filteredProdutos = produtos.filter(p => {
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchFiltro = !filtro || p.categoria_id === filtro
    return matchBusca && matchFiltro
  })

  const deleteProduto = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return
    await supabase.from('produtos').delete().eq('id', id).eq('tenant_id', tenantId)
    fetchProdutos()
  }

  const deleteCategoria = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return
    await supabase.from('categorias').delete().eq('id', id).eq('tenant_id', tenantId)
    fetchProdutos()
  }

  const deleteSabor = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sabor?')) return
    await supabase.from('sabores').delete().eq('id', id).eq('tenant_id', tenantId)
    fetchProdutos()
  }

  const saveCategoria = async (data: Categoria) => {
    if (editCategoria?.id) {
      await supabase.from('categorias').update(data).eq('id', editCategoria.id).eq('tenant_id', tenantId)
    } else {
      await supabase.from('categorias').insert({ ...data, tenant_id: tenantId })
    }
    setShowCategoriaModal(false)
    fetchProdutos()
  }

  const saveSabor = async (data: Sabor) => {
    if (editSabor?.id) {
      await supabase.from('sabores').update(data).eq('id', editSabor.id).eq('tenant_id', tenantId)
    } else {
      await supabase.from('sabores').insert({ ...data, tenant_id: tenantId })
    }
    setShowSaborModal(false)
    fetchProdutos()
  }

  const saveTamanho = async (produtoId: string) => {
    if (!novoTamanho.tamanho || !novoTamanho.preco) return
    await supabase.from('precos_tamanho').insert({
      produto_id: produtoId,
      tamanho: novoTamanho.tamanho,
      preco: Number(novoTamanho.preco),
      tenant_id: tenantId
    })
    setNovoTamanho({ tamanho: '', preco: '' })
    setShowTamanhoModal(false)
    // Recarregar tamanhos
    const { data } = await supabase.from('precos_tamanho').select('*').eq('produto_id', produtoId)
    if (data) setPrecosTamanho(data)
  }

  const deleteTamanho = async (tamanhoId: string) => {
    await supabase.from('precos_tamanho').delete().eq('id', tamanhoId)
    setPrecosTamanho(precosTamanho.filter(t => t.id !== tamanhoId))
  }

  // Salvar categoria inline
  const saveCategoriaInline = async () => {
    if (!novaCategoriaInline.trim()) return
    await supabase.from('categorias').insert({ nome: novaCategoriaInline.trim(), tenant_id: tenantId })
    setNovaCategoriaInline('')
    fetchProdutos()
  }

  // Salvar sabor inline
  const saveSaborInline = async () => {
    if (!novoSaborInline.trim()) return
    await supabase.from('sabores').insert({ nome: novoSaborInline.trim(), disponivel: true, tenant_id: tenantId })
    setNovoSaborInline('')
    fetchProdutos()
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[#e8391a] font-bold uppercase tracking-[0.3em] text-[10px]">Administração</span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-[Outfit] font-bold text-white tracking-tight">Cardápio</h1>
          </div>
        </div>

        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setEditCategoria({}); setShowCategoriaModal(true) }} className="px-3 sm:px-4 py-2 rounded-lg bg-[#252830] text-white text-xs font-bold uppercase">Categorias</button>
            <button onClick={() => { setEditSabor({}); setShowSaborModal(true) }} className="px-3 sm:px-4 py-2 rounded-lg bg-[#252830] text-white text-xs font-bold uppercase">Sabores</button>
          </div>
          <button onClick={() => { setEditProduto({}); setShowProdutoModal(true) }} className="w-full sm:w-auto bg-[#e8391a] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-lg">add</span> Novo Produto
          </button>
        </div>

        {/* Categorias */}
        {categorias.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-sm font-bold text-gray-400 uppercase mb-3 tracking-wider">Categorias</h2>
            <div className="flex flex-wrap gap-2">
              {categorias.map(c => (
                <div key={c.id} className="relative group">
                  <button onClick={() => { setEditCategoria(c); setShowCategoriaModal(true) }} className="px-3 py-1.5 rounded-full bg-[#252830] text-white text-xs font-medium hover:bg-[#333] transition-all">{c.nome}</button>
                  <button onClick={() => deleteCategoria(c.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 sm:py-4 px-5 text-sm text-white mb-4 lg:mb-6 placeholder:text-gray-500" />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 lg:mb-6">
          <button onClick={() => setFiltro(null)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${!filtro ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>Todos</button>
          {categorias.map(c => (
            <button key={c.id} onClick={() => setFiltro(c.id)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${filtro === c.id ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}>{c.nome}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
          {filteredProdutos.map(p => (
            <div key={p.id} className="group relative bg-[#16181f] rounded-2xl overflow-hidden border border-[#252830] hover:border-[#e8391a] transition-all">
              <div className="aspect-[4/3] relative overflow-hidden bg-[#1a1a1a]">
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
                {p.destaque && (
                  <div className="absolute top-2 left-2 bg-[#ffc107] text-black px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Destaque</div>
                )}
                <button onClick={() => { setEditProduto(p); setShowProdutoModal(true) }} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                {!p.disponivel && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-gray-400 text-xs font-bold uppercase">Indisponível</span>
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-bold text-white text-sm sm:text-base mb-1 truncate">{p.nome}</h3>
                <p className="text-gray-400 text-xs line-clamp-2">{p.descricao || 'Sem descrição'}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[#e8391a] font-bold">{Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <button onClick={() => deleteProduto(p.id)} className="text-gray-500 hover:text-red-500 transition-all">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sabores */}
        {sabores.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Sabores</h2>
              <button onClick={() => { setEditSabor({}); setShowSaborModal(true) }} className="text-[#e8391a] text-xs font-bold uppercase">+ Novo</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sabores.map(s => (
                <div key={s.id} className="relative group">
                  <span className="px-3 py-1.5 rounded-full bg-[#252830] text-white text-xs font-medium">{s.nome}</span>
                  <button onClick={() => { setEditSabor(s); setShowSaborModal(true) }} className="absolute -top-1 -right-1 w-4 h-4 bg-[#ffc107] rounded-full text-black text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">!</button>
                  <button onClick={() => deleteSabor(s.id)} className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categoria Modal */}
        {showCategoriaModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowCategoriaModal(false)}>
            <div className="w-full max-w-md rounded-2xl bg-[#16181f] p-6 sm:p-8" onClick={e => e.stopPropagation()}>
              <h3 className="font-headline text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white tracking-tight">{editCategoria?.id ? 'Editar' : 'Nova'} Categoria</h3>
              <form onSubmit={categoriaForm.handleSubmit(saveCategoria)} className="space-y-4">
                <input {...categoriaForm.register('nome', { required: true })} placeholder="Nome da categoria" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 sm:py-4 px-4 text-sm text-white" />
                <textarea {...categoriaForm.register('descricao')} placeholder="Descrição (opcional)" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 sm:py-4 px-4 text-sm text-white h-24 resize-none" />
                <input type="number" {...categoriaForm.register('ordem', { valueAsNumber: true })} placeholder="Ordem" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 sm:py-4 px-4 text-sm text-white" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowCategoriaModal(false)} className="flex-1 py-4 rounded-xl border border-[#252830] text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#252830] transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-xl bg-[#e8391a] text-white font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] transition-all">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sabor Modal */}
        {showSaborModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowSaborModal(false)}>
            <div className="w-full max-w-md rounded-2xl bg-[#16181f] p-6 sm:p-8" onClick={e => e.stopPropagation()}>
              <h3 className="font-headline text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white tracking-tight">{editSabor?.id ? 'Editar' : 'Novo'} Sabor</h3>
              <form onSubmit={saborForm.handleSubmit(saveSabor)} className="space-y-4">
                <input {...saborForm.register('nome', { required: true })} placeholder="Nome do sabor" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 sm:py-4 px-4 text-sm text-white" />
                <textarea {...saborForm.register('descricao')} placeholder="Descrição (opcional)" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 sm:py-4 px-4 text-sm text-white h-24 resize-none" />
                <label className="flex items-center gap-2 text-white text-sm">
                  <input type="checkbox" {...saborForm.register('disponivel')} className="w-4 h-4" />
                  Disponível
                </label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowSaborModal(false)} className="flex-1 py-4 rounded-xl border border-[#252830] text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#252830] transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-xl bg-[#e8391a] text-white font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] transition-all">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Produto Sidebar */}
        {showProdutoModal && (
          <div className="fixed inset-0 bg-black/50 z-[999]" onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); }}>
            <div className="absolute right-0 top-0 h-full w-full max-w-[500px] bg-[#16181f] shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline text-xl font-bold text-white">{editProduto?.id ? 'Editar' : 'Novo'} Produto</h3>
                  <button type="button" onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); }} className="w-10 h-10 rounded-lg bg-[#252830] flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form onSubmit={produtoForm.handleSubmit(async (data) => {
                  setUploading(true)
                  const record: any = {
                    nome: data.nome,
                    descricao: data.descricao || '',
                    categoria_id: data.categoria_id || null,
                    disponivel: data.disponivel,
                    destaque: data.destaque,
                    tempo_preparo: data.tempo_preparo || 30,
                    imagem_url: data.imagem_url || ''
                  }
                  if (data.preco !== undefined && data.preco !== null && data.preco > 0) {
                    record.preco = data.preco
                  }

                  let produtoId = editProduto?.id
                  
                  if (!produtoId) {
                    const { data: insertData, error: insertError } = await supabase.from('produtos').insert({ ...record, ordem: produtos.length, tenant_id: tenantId }).select().single()
                    if (insertError) {
                      alert('Erro ao salvar: ' + insertError.message)
                      setUploading(false)
                      return
                    }
                    produtoId = insertData.id
                  } else {
                    const { error: updateError } = await supabase.from('produtos').update(record).eq('id', produtoId).eq('tenant_id', tenantId)
                    if (updateError) {
                      alert('Erro ao salvar: ' + updateError.message)
                      setUploading(false)
                      return
                    }
                  }
                  
                  if (selectedFile && produtoId) {
                    const imageUrl = await uploadPhoto(produtoId)
                    if (imageUrl) {
                      await supabase.from('produtos').update({ imagem_url: imageUrl }).eq('id', produtoId).eq('tenant_id', tenantId)
                    }
                  }

                  setUploading(false)
                  setSelectedFile(null)
                  setImagePreview(null)
                  setShowProdutoModal(false)
                  setEditProduto(null)
                  fetchProdutos()
                })} className="space-y-4">
                  <div className="flex justify-center mb-6">
                    <div className="relative w-full max-w-[200px] aspect-[4/5]">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="photo-input" disabled={uploading} />
                      {(imagePreview || editProduto?.imagem_url) ? (
                        <div className="relative w-full h-full rounded-xl overflow-hidden">
                          <img src={imagePreview || editProduto?.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => { setSelectedFile(null); setImagePreview(null) }} className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="photo-input" className="w-full h-full border-2 border-dashed border-[#252830] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#e8391a] transition-all">
                          <span className="material-symbols-outlined text-4xl text-gray-500">add_photo_alternate</span>
                          <span className="text-gray-500 text-xs mt-2">Adicionar foto</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="mb-4">
                    <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Nome do Produto *</label>
                    <input {...produtoForm.register('nome', { required: true })} placeholder="Ex: Pizza Margherita" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" />
                  </div>

                  {/* Descrição */}
                  <div className="mb-4">
                    <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Descrição</label>
                    <textarea {...produtoForm.register('descricao')} placeholder="Descrição do produto..." className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white h-24 resize-none" />
                  </div>

                  {/* Preço e Tempo na mesma linha */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Preço (R$) *</label>
                      <input type="number" step="0.01" {...produtoForm.register('preco', { valueAsNumber: true })} placeholder="0,00" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Tempo (min)</label>
                      <input type="number" {...produtoForm.register('tempo_preparo', { valueAsNumber: true })} placeholder="30" className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" />
                    </div>
                  </div>

                  {/* Categoria - COR VERMELHA */}
                  <div className="mb-4 p-4 rounded-xl bg-[#e8391a]/10 border border-[#e8391a]/30">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[#e8391a] text-xs uppercase font-bold">Categoria</label>
                    </div>
                    <div className="flex gap-2">
                      <select {...produtoForm.register('categoria_id')} className="flex-1 bg-[#1a1a1a] border border-[#e8391a]/50 rounded-xl py-3 px-4 text-sm text-white">
                        <option value="">Selecione</option>
                        {categorias.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                      <div className="relative flex-1 flex gap-1">
                        <input 
                          value={novaCategoriaInline} 
                          onChange={e => setNovaCategoriaInline(e.target.value)}
                          placeholder="Nova categoria" 
                          className="flex-1 bg-[#1a1a1a] border border-[#e8391a]/50 rounded-xl py-3 px-4 text-sm text-white"
                        />
                        <button type="button" onClick={saveCategoriaInline} className="px-3 bg-[#e8391a] rounded-xl text-white font-bold">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Tamanhos - COR LARANJA */}
                  <div className="mb-4 p-4 rounded-xl bg-[#ff9800]/10 border border-[#ff9800]/30">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[#ff9800] text-xs uppercase font-bold">Tamanhos e Preços</label>
                    </div>
                    {/* Adicionar novo tamanho inline */}
                    <div className="flex gap-2 mb-3">
                      <input 
                        value={novoTamanho.tamanho} 
                        onChange={e => setNovoTamanho({...novoTamanho, tamanho: e.target.value})}
                        placeholder="Tamanho (ex: Grande)" 
                        className="flex-1 bg-[#1a1a1a] border border-[#ff9800]/50 rounded-xl py-2 px-3 text-sm text-white"
                      />
                      <input 
                        type="number"
                        value={novoTamanho.preco} 
                        onChange={e => setNovoTamanho({...novoTamanho, preco: e.target.value})}
                        placeholder="R$" 
                        className="w-20 bg-[#1a1a1a] border border-[#ff9800]/50 rounded-xl py-2 px-3 text-sm text-white"
                      />
                      <button 
                        type="button" 
                        onClick={() => saveTamanho(editProduto?.id || '')} 
                        className="px-3 bg-[#ff9800] rounded-xl text-black font-bold"
                      >+</button>
                    </div>
                    {/* Lista de tamanhos */}
                    <div className="space-y-2">
                      {loadingTamanhos ? (
                        <span className="text-gray-500 text-xs">Carregando...</span>
                      ) : precosTamanho.length === 0 ? (
                        <span className="text-gray-500 text-xs">Nenhum tamanho cadastrado</span>
                      ) : (
                        precosTamanho.map(t => (
                          <div key={t.id} className="flex items-center justify-between bg-[#252830] rounded-lg px-3 py-2">
                            <span className="text-white text-sm font-medium">{t.tamanho}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#ff9800] font-bold">{Number(t.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              <button type="button" onClick={() => deleteTamanho(t.id!)} className="text-red-500 hover:text-red-400">×</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Sabores - COR VERDE */}
                  <div className="mb-4 p-4 rounded-xl bg-[#4caf50]/10 border border-[#4caf50]/30">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[#4caf50] text-xs uppercase font-bold">Sabores</label>
                    </div>
                    {/* Adicionar novo sabor inline */}
                    <div className="flex gap-2 mb-3">
                      <input 
                        value={novoSaborInline} 
                        onChange={e => setNovoSaborInline(e.target.value)}
                        placeholder="Novo sabor" 
                        className="flex-1 bg-[#1a1a1a] border border-[#4caf50]/50 rounded-xl py-2 px-3 text-sm text-white"
                      />
                      <button 
                        type="button" 
                        onClick={saveSaborInline} 
                        className="px-3 bg-[#4caf50] rounded-xl text-black font-bold"
                      >+</button>
                    </div>
                    {/* Lista de sabores */}
                    <div className="flex gap-2 flex-wrap">
                      {sabores.length === 0 ? (
                        <span className="text-gray-500 text-xs">Nenhum sabor cadastrado</span>
                      ) : (
                        sabores.map(s => (
                          <span key={s.id} className="px-2 py-1 bg-[#252830] rounded-lg text-xs text-white flex items-center gap-1">
                            {s.nome}
                            <button type="button" onClick={() => deleteSabor(s.id)} className="text-red-500 hover:text-red-400 ml-1">×</button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Opções */}
                  <div className="mb-4">
                    <label className="text-gray-400 text-xs uppercase font-bold mb-3 block">Opções</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                        <input type="checkbox" {...produtoForm.register('disponivel')} className="w-5 h-5 rounded" />
                        Disponível
                      </label>
                      <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                        <input type="checkbox" {...produtoForm.register('destaque')} className="w-5 h-5 rounded" />
                        Destaque
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button type="button" onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); }} className="flex-1 py-3 rounded-xl border border-[#333] text-[#888] font-headline font-bold text-xs uppercase tracking-widest hover:bg-[#252830] transition-all" disabled={uploading}>Cancelar</button>
                    <button type="submit" disabled={uploading} className="flex-1 py-3 rounded-xl bg-[#ff5722] text-white font-headline font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,86,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? 'Salvando...' : 'Salvar'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Novo Tamanho Modal */}
        {showTamanhoModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4" onClick={() => setShowTamanhoModal(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-[#16181f] p-6" onClick={e => e.stopPropagation()}>
              <h3 className="font-headline text-xl font-bold mb-4 text-white">Novo Tamanho</h3>
              <div className="space-y-3">
                <input 
                  value={novoTamanho.tamanho} 
                  onChange={e => setNovoTamanho({...novoTamanho, tamanho: e.target.value})}
                  placeholder="Tamanho (ex: Grande)" 
                  className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white"
                />
                <input 
                  type="number"
                  value={novoTamanho.preco} 
                  onChange={e => setNovoTamanho({...novoTamanho, preco: e.target.value})}
                  placeholder="Preço" 
                  className="w-full bg-[#1a1a1a] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white"
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowTamanhoModal(false)} className="flex-1 py-3 rounded-xl border border-[#252830] text-gray-400 font-bold text-xs uppercase hover:bg-[#252830] transition-all">Cancelar</button>
                  <button onClick={() => saveTamanho(editProduto?.id || '')} className="flex-1 py-3 rounded-xl bg-[#ff9800] text-black font-bold text-xs uppercase hover:shadow-[0_0_20px_rgba(255,152,0,0.3)] transition-all">Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}