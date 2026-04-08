import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../contexts/AuthContext'

interface Categoria { id: string; nome: string; descricao: string; ordem: number; ativo: boolean }
interface Produto { id: string; categoria_id: string; nome: string; descricao: string; preco: number | undefined; disponivel: boolean; destaque: boolean; tempo_preparo: number; imagem_url: string }
interface PrecoTamanho { id: string; produto_id: string; tamanho: string; preco: number }
interface Sabor { id: string; nome: string; descricao: string; disponivel: boolean }

export default function CardapioAdminPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [tab, setTab] = useState<'categorias' | 'produtos' | 'complementos'>('produtos')
  const [editProduto, setEditProduto] = useState<Partial<Produto> | null>(null)
  const [editCategoria, setEditCategoria] = useState<Partial<Categoria> | null>(null)
  const [precos, setPrecos] = useState<PrecoTamanho[]>([])
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [draggedCategoria, setDraggedCategoria] = useState<string | null>(null)
  const [newTamanho, setNewTamanho] = useState('')
  const [newPrecoValor, setNewPrecoValor] = useState('')
  const [produtoPrecos, setProdutoPrecos] = useState<Record<string, PrecoTamanho[]>>({})
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [editSabor, setEditSabor] = useState<Partial<Sabor> | null>(null)
  const [showSaborModal, setShowSaborModal] = useState(false)
  const [selectedProdutoComplementos, setSelectedProdutoComplementos] = useState<Produto | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { user } = useAuth()

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase.from('categorias').select('*').order('ordem')
    if (data) setCategorias(data)
  }, [])

  const fetchProdutos = useCallback(async () => {
    const { data } = await supabase.from('produtos').select('*').order('ordem')
    if (data) setProdutos(data)
    
    const { data: precosData } = await supabase.from('precos_tamanho').select('*')
    if (precosData) {
      const grouped: Record<string, PrecoTamanho[]> = {}
      precosData.forEach(p => {
        if (!grouped[p.produto_id]) grouped[p.produto_id] = []
        grouped[p.produto_id].push(p)
      })
      setProdutoPrecos(grouped)
    }
  }, [])

  const fetchSabores = useCallback(async () => {
    const { data } = await supabase.from('sabores').select('*').order('nome')
    if (data) setSabores(data)
  }, [])

  const fetchPrecos = useCallback(async (produtoId: string) => {
    const { data } = await supabase.from('precos_tamanho').select('*').eq('produto_id', produtoId)
    if (data) setPrecos(data)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCategorias(), fetchProdutos(), fetchSabores()])
    }
    loadData()
  }, [])

  useRealtime('produtos', fetchProdutos)

  const saveCategoria = async () => {
    if (!editCategoria?.nome) return
    const payload = { nome: editCategoria.nome, descricao: editCategoria.descricao || '' }
    const { error } = editCategoria.id 
      ? await supabase.from('categorias').update(payload).eq('id', editCategoria.id)
      : await supabase.from('categorias').insert({ ...payload, ordem: categorias.length })
    
    if (error) {
      console.error('Erro ao salvar categoria:', error)
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    setShowCategoriaModal(false)
    setEditCategoria(null)
    fetchCategorias()
  }

  const deleteCategoria = async (id: string) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchCategorias()
  }

  const handleDropCategoria = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedCategoria || draggedCategoria === targetId) return

    const draggedIdx = categorias.findIndex(c => c.id === draggedCategoria)
    const targetIdx = categorias.findIndex(c => c.id === targetId)

    const novasCategorias = [...categorias]
    const [item] = novasCategorias.splice(draggedIdx, 1)
    novasCategorias.splice(targetIdx, 0, item)

    setCategorias(novasCategorias)
    setDraggedCategoria(null)

    const updates = novasCategorias.map((c, idx) => 
      supabase.from('categorias').update({ ordem: idx }).eq('id', c.id)
    )
    await Promise.all(updates)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const uploadPhoto = async (produtoId: string): Promise<string | null> => {
    if (!selectedFile || !user) {
      alert('Erro: usuário não autenticado')
      return null
    }
    
    const tenantId = user.id
    const ext = selectedFile.name.split('.').pop() || 'jpg'
    const filePath = `${tenantId}/${produtoId}.${ext}`
    
    const { error } = await supabase.storage
      .from('produtos')
      .upload(filePath, selectedFile, { 
        upsert: true,
        contentType: selectedFile.type || 'image/jpeg'
      })
    
    if (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload. Verifique se o bucket "produtos" existe e se a policy de upload do Supabase esta configurada para o usuario autenticado.')
      return null
    }
    
    const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const removePhoto = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setEditProduto(p => p ? { ...p, imagem_url: '' } : null)
  }

  const saveProduto = async () => {
    if (!editProduto?.nome) return
    
    setUploading(true)
    
    const record: any = {
      nome: editProduto.nome,
      descricao: editProduto.descricao || '',
      categoria_id: editProduto.categoria_id || null,
      disponivel: editProduto.disponivel ?? true,
      destaque: editProduto.destaque ?? false,
      tempo_preparo: editProduto.tempo_preparo || 30,
      imagem_url: editProduto.imagem_url || ''
    }
    if (editProduto.preco !== undefined && editProduto.preco !== null && editProduto.preco > 0) {
      record.preco = editProduto.preco
    }

    let produtoId = editProduto.id
    
    if (!produtoId) {
      const { data, error: insertError } = await supabase.from('produtos').insert({ ...record, ordem: produtos.length }).select().single()
      if (insertError) {
        console.error('Erro ao salvar produto:', insertError)
        alert('Erro ao salvar: verifique se você está logado corretamente. (RLS)')
        setUploading(false)
        return
      }
      produtoId = data.id
    } else {
      const { error: updateError } = await supabase.from('produtos').update(record).eq('id', produtoId)
      if (updateError) {
        console.error('Erro ao salvar produto:', updateError)
        alert('Erro ao salvar: verifique se você está logado corretamente. (RLS)')
        setUploading(false)
        return
      }
    }
    
    if (selectedFile && produtoId) {
      const imageUrl = await uploadPhoto(produtoId)
      if (imageUrl) {
        await supabase.from('produtos').update({ imagem_url: imageUrl }).eq('id', produtoId)
      }
    }

    setUploading(false)
    setSelectedFile(null)
    setImagePreview(null)
    setShowProdutoModal(false)
    setEditProduto(null)
    fetchProdutos()
  }

  const deleteProduto = async (id: string) => {
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchProdutos()
  }

  const toggleDisponivel = async (p: Produto) => {
    await supabase.from('produtos').update({ disponivel: !p.disponivel }).eq('id', p.id)
    fetchProdutos()
  }

  const addPreco = async (produtoId: string) => {
    if (!newTamanho || !newPrecoValor) return
    const { error } = await supabase.from('precos_tamanho').insert({ produto_id: produtoId, tamanho: newTamanho, preco: Number(newPrecoValor) })
    if (error) {
      alert('Erro ao adicionar preço: ' + error.message)
    } else {
      setNewTamanho('')
      setNewPrecoValor('')
      fetchPrecos(produtoId)
      fetchProdutos()
    }
  }

  const deletePreco = async (precoId: string, produtoId: string) => {
    const { error } = await supabase.from('precos_tamanho').delete().eq('id', precoId)
    if (error) alert('Erro ao excluir preço: ' + error.message)
    fetchPrecos(produtoId)
    fetchProdutos()
  }

  const saveSabor = async () => {
    if (!editSabor?.nome) return
    const payload = { nome: editSabor.nome, descricao: editSabor.descricao || '', disponivel: editSabor.disponivel ?? true }
    const { error } = editSabor.id 
      ? await supabase.from('sabores').update(payload).eq('id', editSabor.id)
      : await supabase.from('sabores').insert(payload)
    
    if (error) {
      console.error('Erro ao salvar sabor:', error)
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    setShowSaborModal(false)
    setEditSabor(null)
    fetchSabores()
  }

  const deleteSabor = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sabor?')) return
    const { error } = await supabase.from('sabores').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchSabores()
  }

  const toggleSaborDisponivel = async (sabor: Sabor) => {
    await supabase.from('sabores').update({ disponivel: !sabor.disponivel }).eq('id', sabor.id)
    fetchSabores()
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6">
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <span className="text-[#e8391a] font-bold uppercase tracking-[0.3em] text-[8px] sm:text-[10px] mb-1 sm:mb-2 block">Gestão</span>
          <h2 className="text-3xl sm:text-5xl font-[Outfit] font-bold text-white tracking-tighter">Cardápio</h2>
        </div>
        <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#252830] w-full">
          <button onClick={() => setTab('produtos')} className={`flex-1 px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-widest transition-all whitespace-nowrap ${tab === 'produtos' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Produtos</button>
          <button onClick={() => setTab('complementos')} className={`flex-1 px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-widest transition-all whitespace-nowrap ${tab === 'complementos' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Complementos</button>
          <button onClick={() => setTab('categorias')} className={`flex-1 px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-widest transition-all whitespace-nowrap ${tab === 'categorias' ? 'bg-[#e8391a] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Categorias</button>
        </div>
      </div>

      {tab === 'categorias' && (
        <div>
          <button onClick={() => { setEditCategoria({}); setShowCategoriaModal(true) }} className="mb-6 sm:mb-8 w-full sm:w-auto bg-[#e8391a] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-lg">add</span> Nova Categoria
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.map(c => (
              <div 
                key={c.id} 
                draggable
                onDragStart={() => setDraggedCategoria(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropCategoria(e, c.id)}
                className={`bg-[#1a1a1a] p-8 rounded-2xl border transition-all group cursor-grab active:cursor-grabbing relative overflow-hidden ${draggedCategoria === c.id ? 'border-[#e8391a] opacity-50 scale-95 shadow-lg' : 'border-[#252830] hover:border-[#e8391a]/30'}`}
              >
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-transparent via-[#252830] to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#252830]/50 text-xs">drag_indicator</span>
                </div>
                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h4 className="font-[Outfit] font-bold text-xl text-white">{c.nome}</h4>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{c.descricao}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditCategoria(c); setShowCategoriaModal(true) }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onClick={() => deleteCategoria(c.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'produtos' && (
        <div>
          <button onClick={() => { setEditProduto({}); setShowProdutoModal(true) }} className="mb-6 sm:mb-8 w-full sm:w-auto bg-[#e8391a] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-lg">add</span> Novo Produto
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produtos.map(p => (
              <div key={p.id} className={`bg-[#1a1a1a] p-6 rounded-2xl border border-[#252830] hover:border-[#e8391a]/20 transition-all group flex flex-col ${!p.disponivel ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="font-[Outfit] font-bold text-lg text-white">{p.nome}</h4>
                    <span className="text-[10px] font-bold text-[#e8391a] uppercase tracking-widest">
                      {categorias.find(c => c.id === p.categoria_id)?.nome || 'Sem Categoria'}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">
                    {produtoPrecos[p.id]?.length ? 
                      `A partir de R$ ${Math.min(...produtoPrecos[p.id].map(t => Number(t.preco))).toFixed(2)}` : 
                      (p.preco ? Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sem preco')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-6 flex-1 line-clamp-2">{p.descricao}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-[#252830]/50">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditProduto(p); setShowProdutoModal(true); fetchPrecos(p.id) }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onClick={() => deleteProduto(p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                  <button onClick={() => toggleDisponivel(p)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-tighter transition-all ${p.disponivel ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {p.disponivel ? 'No Cardapio' : 'Esgotado'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'complementos' && (
        <div>
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-[Outfit] font-bold text-white">Sabores de Pizza</h3>
              <button 
                onClick={() => { setEditSabor({}); setShowSaborModal(true) }} 
                className="bg-[#e8391a] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span> Novo Sabor
              </button>
            </div>
            
            {sabores.length === 0 ? (
              <div className="p-8 bg-[#1a1a1a] rounded-xl border border-[#252830] text-center">
                <p className="text-gray-400">Nenhum sabor cadastrado ainda.</p>
                <p className="text-xs text-gray-500 mt-2">Cadastre os sabores das pizzas para permitir meio a meio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sabores.map(sabor => (
                  <div key={sabor.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-[#252830] flex justify-between items-start">
                    <div>
                      <h4 className="font-[Outfit] font-bold text-white">{sabor.nome}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sabor.descricao}</p>
                      <button 
                        onClick={() => toggleSaborDisponivel(sabor)} 
                        className={`inline-block mt-2 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer ${sabor.disponivel ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                      >
                        {sabor.disponivel ? 'Disponivel' : 'Indisponivel'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditSabor(sabor); setShowSaborModal(true) }} 
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button 
                        onClick={() => deleteSabor(sabor.id)} 
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-[#252830] my-8" />

          <div className="mb-6 p-4 bg-[#1a1a1a] rounded-xl border border-[#252830]">
            <p className="text-sm text-gray-400">
              Gerencie os tamanhos e precos dos produtos (ex: Pizzas - P, M, G, GG).<br/>
              Selecione um produto abaixo para adicionar ou editar seus complementos.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {produtos.filter(p => produtoPrecos[p.id]?.length > 0).map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedProdutoComplementos(p)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedProdutoComplementos?.id === p.id 
                    ? 'bg-[#e8391a]/20 border-[#e8391a]' 
                    : 'bg-[#1a1a1a] border-[#252830] hover:border-[#e8391a]/30'
                }`}
              >
                <h4 className="font-[Outfit] font-bold text-white">{p.nome}</h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {produtoPrecos[p.id]?.map(pt => (
                    <span key={pt.id} className="text-[10px] bg-[#252830] px-2 py-1 rounded-full text-gray-400">
                      {pt.tamanho}: R$ {Number(pt.preco).toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedProdutoComplementos && (
            <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-[Outfit] font-bold text-white">
                  {selectedProdutoComplementos.nome} - Complementos
                </h3>
                <button 
                  onClick={() => setSelectedProdutoComplementos(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Tamanhos cadastrados</h4>
                {produtoPrecos[selectedProdutoComplementos.id]?.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum tamanho cadastrado ainda.</p>
                ) : (
                  produtoPrecos[selectedProdutoComplementos.id]?.map(pt => (
                    <div key={pt.id} className="flex items-center justify-between bg-[#252830] p-4 rounded-xl border border-[#333]">
                      <span className="text-sm font-bold uppercase tracking-widest text-white">{pt.tamanho} -- <span className="text-emerald-400">R$ {Number(pt.preco).toFixed(2)}</span></span>
                      <button onClick={async () => {
                        await supabase.from('precos_tamanho').delete().eq('id', pt.id)
                        fetchProdutos()
                      }} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[#252830] pt-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Adicionar novo tamanho</h4>
                <div className="flex gap-3">
                  <input 
                    value={newTamanho} 
                    onChange={e => setNewTamanho(e.target.value)} 
                    placeholder="Tamanho (Ex: P, M, G, GG)" 
                    className="flex-1 bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" 
                  />
                  <input 
                    value={newPrecoValor} 
                    onChange={e => setNewPrecoValor(e.target.value)} 
                    type="number" 
                    step="0.01" 
                    placeholder="R$ 0,00" 
                    className="w-32 bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" 
                  />
                  <button 
                    onClick={() => addPreco(selectedProdutoComplementos.id)} 
                    className="bg-[#e8391a] text-white px-6 rounded-xl text-sm font-bold uppercase"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {produtos.filter(p => !produtoPrecos[p.id]?.length).length > 0 && (
            <div className="mt-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Produtos sem complementos ainda</h4>
              <div className="flex flex-wrap gap-2">
                {produtos.filter(p => !produtoPrecos[p.id]?.length).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProdutoComplementos(p)}
                    className="px-4 py-2 bg-[#1a1a1a] rounded-full text-xs font-bold text-gray-400 hover:bg-[#e8391a]/20 hover:text-[#e8391a] transition-all"
                  >
                    + {p.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCategoriaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowCategoriaModal(false)}>
          <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-10 w-full max-w-lg border border-[#252830] shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white tracking-tight">{editCategoria?.id ? 'Editar' : 'Nova'} Categoria</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Nome da Categoria</label>
                <input value={editCategoria?.nome || ''} onChange={e => setEditCategoria(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Pizzas Gourmet" className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Descricao</label>
                <textarea value={editCategoria?.descricao || ''} onChange={e => setEditCategoria(p => ({ ...p, descricao: e.target.value }))} placeholder="Pequena descricao para o cardapio" rows={3} className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white resize-none" />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowCategoriaModal(false)} className="flex-1 py-4 rounded-xl border border-[#252830] text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#252830] transition-all">Cancelar</button>
              <button onClick={saveCategoria} className="flex-1 py-4 rounded-xl bg-[#e8391a] text-white font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showSaborModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowSaborModal(false)}>
          <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-10 w-full max-w-lg border border-[#252830] shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white tracking-tight">{editSabor?.id ? 'Editar' : 'Novo'} Sabor</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Nome do Sabor</label>
                <input value={editSabor?.nome || ''} onChange={e => setEditSabor(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Margherita" className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Descricao</label>
                <textarea value={editSabor?.descricao || ''} onChange={e => setEditSabor(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Molgo de tomate, mussarela, manjericao fresco" rows={3} className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white resize-none" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${editSabor?.disponivel !== false ? 'bg-[#e8391a] border-[#e8391a]' : 'border-[#444]'}`}>
                  <input type="checkbox" className="hidden" checked={editSabor?.disponivel ?? true} onChange={e => setEditSabor(p => ({ ...p, disponivel: e.target.checked }))} />
                  {editSabor?.disponivel !== false && <span className="material-symbols-outlined text-white text-base">check</span>}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-white">Disponivel</span>
              </label>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowSaborModal(false)} className="flex-1 py-4 rounded-xl border border-[#252830] text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#252830] transition-all">Cancelar</button>
              <button onClick={saveSabor} className="flex-1 py-4 rounded-xl bg-[#e8391a] text-white font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showProdutoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[4px] z-[999] flex items-center justify-center p-3 sm:p-4 md:p-6" onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); }}>
          <div className="w-full max-w-[600px] max-h-[95vh] overflow-y-auto rounded-2xl bg-[#16181f] p-5 sm:p-8 md:rounded-3xl md:p-10 no-scrollbar animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline text-xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white tracking-tight">{editProduto?.id ? 'Editar' : 'Novo'} Produto</h3>
            <div className="space-y-6">
              <div className="flex justify-center mb-6">
                <div className="relative w-full max-w-[200px] aspect-[4/5]">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="photo-input" disabled={uploading} />
                  {(imagePreview || editProduto?.imagem_url) ? (
                    <div className="relative w-full h-full rounded-xl overflow-hidden">
                      <img src={imagePreview || editProduto?.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={removePhoto} className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-all">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="photo-input" className="flex flex-col items-center justify-center w-full h-full bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-xl cursor-pointer hover:border-[#555] transition-all">
                      <span className="material-symbols-outlined text-4xl text-[#555]">photo_camera</span>
                      <span className="text-sm text-[#555] mt-2">Adicionar foto</span>
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Nome do Produto</label>
                <input value={editProduto?.nome || ''} onChange={e => setEditProduto(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Pizza Calabresa Especial" className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Descricao Detalhada</label>
                <textarea value={editProduto?.descricao || ''} onChange={e => setEditProduto(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva os ingredientes e detalhes" rows={3} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white resize-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Preco Base (R$) <span className="text-[10px] normal-case text-[#666]">- Opcional (use se nao houver tamanhos)</span></label>
                  <input type="number" step="0.01" value={editProduto?.preco ?? ''} onChange={e => setEditProduto(p => ({ ...p, preco: e.target.value ? Number(e.target.value) : undefined }))} placeholder="Ex: 25.00 (ou deixe vazio se usar tamanhos)" className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Tempo de Preparo (Min)</label>
                  <input type="number" value={editProduto?.tempo_preparo || 30} onChange={e => setEditProduto(p => ({ ...p, tempo_preparo: Number(e.target.value) }))} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Categoria</label>
                <select value={editProduto?.categoria_id || ''} onChange={e => setEditProduto(p => ({ ...p, categoria_id: e.target.value }))} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white cursor-pointer">
                  <option value="">Sem categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="flex gap-8 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${editProduto?.disponivel !== false ? 'bg-[#ff5722] border-[#ff5722]' : 'border-[#444]'}`}>
                    <input type="checkbox" className="hidden" checked={editProduto?.disponivel ?? true} onChange={e => setEditProduto(p => ({ ...p, disponivel: e.target.checked }))} />
                    {editProduto?.disponivel !== false && <span className="material-symbols-outlined text-white text-base">check</span>}
                  </div>
                  <span className="text-sm font-headline font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-white">Disponivel</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${editProduto?.destaque ? 'bg-[#ffc107] border-[#ffc107]' : 'border-[#444]'}`}>
                    <input type="checkbox" className="hidden" checked={editProduto?.destaque ?? false} onChange={e => setEditProduto(p => ({ ...p, destaque: e.target.checked }))} />
                    {editProduto?.destaque && <span className="material-symbols-outlined text-black text-base">star</span>}
                  </div>
                  <span className="text-sm font-headline font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-[#ffc107]">Destaque</span>
                </label>
              </div>

              {editProduto?.id && (
                <div className="border-t border-[#333] pt-8 mt-4">
                  <h4 className="text-xs font-headline font-bold uppercase tracking-[0.2em] mb-4 text-[#888]">Precos por Tamanho (Variacoes)</h4>
                  <div className="space-y-3">
                    {precos.map(pt => (
                      <div key={pt.id} className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                        <span className="text-sm font-bold uppercase tracking-widest text-white">{pt.tamanho} -- <span className="text-[#4ade80]">R$ {Number(pt.preco).toFixed(2)}</span></span>
                        <button onClick={() => deletePreco(pt.id, editProduto.id!)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                      <div className="flex gap-3 mt-4">
                        <input value={newTamanho} onChange={e => setNewTamanho(e.target.value)} placeholder="Tamanho (Ex: G, M, 2L)" className="flex-1 bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-3 px-4 text-xs text-white" />
                        <input value={newPrecoValor} onChange={e => setNewPrecoValor(e.target.value)} type="number" step="0.01" placeholder="R$ 0,00" className="w-28 bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-3 px-4 text-xs text-white" />
                        <button onClick={() => addPreco(editProduto.id!)} className="bg-[#ffc107] text-black px-4 rounded-xl text-xs font-bold uppercase">+</button>
                      </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); }} className="flex-1 py-4 rounded-xl border border-[#333] text-[#888] font-headline font-bold text-xs uppercase tracking-widest hover:bg-[#1a1a1a] transition-all" disabled={uploading}>Cancelar</button>
              <button onClick={saveProduto} disabled={uploading} className="flex-1 py-4 rounded-xl bg-[#ff5722] text-white font-headline font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,86,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
