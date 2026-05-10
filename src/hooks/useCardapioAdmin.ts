import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { produtoFormSchema } from '../schemas/produtoSchema'
import { getTenantId } from '../lib/getTenantId'

// ============================================
// TYPES
// ============================================

export interface Categoria {
  id: string
  nome: string
  descricao: string
  ordem: number
  ativo: boolean
}

export interface Produto {
  id: string
  categoria_id: string
  nome: string
  descricao: string
  preco: number | undefined
  disponivel: boolean
  destaque: boolean
  tempo_preparo: number
  imagem_url: string
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

export interface ComplementoTemp {
  id?: string
  tamanho: string
  preco: number
}

// ============================================
// HOOK
// ============================================

export function useCardapioAdmin() {
  // ----- State: Data -----
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [precos, setPrecos] = useState<PrecoTamanho[]>([])
  const [produtoPrecos, setProdutoPrecos] = useState<Record<string, PrecoTamanho[]>>({})
  const [sabores, setSabores] = useState<Sabor[]>([])

  // ----- State: UI - Tab -----
  const [tab, setTab] = useState<'categorias' | 'produtos' | 'complementos'>('produtos')

  // ----- State: UI - Produto -----
  const [editProduto, setEditProduto] = useState<Partial<Produto> | null>(null)
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [selectedSabores, setSelectedSabores] = useState<Sabor[]>([])
  const [selectedSaborId, setSelectedSaborId] = useState('')
  const [tempComplementos, setTempComplementos] = useState<ComplementoTemp[]>([])
  const [newTamanho, setNewTamanho] = useState('')
  const [newPrecoValor, setNewPrecoValor] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // ----- State: UI - Inline Categoria -----
  const [showInlineCategoria, setShowInlineCategoria] = useState(false)
  const [newCategoriaNome, setNewCategoriaNome] = useState('')
  const [newCategoriaDescricao, setNewCategoriaDescricao] = useState('')
  const [savingCategoria, setSavingCategoria] = useState(false)

  // ----- State: UI - Inline Sabor -----
  const [showInlineSabor, setShowInlineSabor] = useState(false)
  const [newSaborNome, setNewSaborNome] = useState('')
  const [newSaborDescricao, setNewSaborDescricao] = useState('')
  const [savingSabor, setSavingSabor] = useState(false)

  // ----- State: UI - Categoria Modal -----
  const [editCategoria, setEditCategoria] = useState<Partial<Categoria> | null>(null)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)

  // ----- State: UI - Sabor Modal -----
  const [editSabor, setEditSabor] = useState<Partial<Sabor> | null>(null)
  const [showSaborModal, setShowSaborModal] = useState(false)

  // ----- State: UI - Complementos Tab -----
  const [selectedProdutoComplementos, setSelectedProdutoComplementos] = useState<Produto | null>(null)

  // ----- State: UI - Drag & Drop -----
  const [draggedCategoria, setDraggedCategoria] = useState<string | null>(null)

  // ----- Auth & Tenant -----
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const tenantId = useMemo(() => {
    if (authLoading) return null
    if (!user) return null

    const userMetadataTenantId = user.user_metadata?.tenant_id
    if (userMetadataTenantId && typeof userMetadataTenantId === 'string' && userMetadataTenantId.trim()) {
      return userMetadataTenantId.trim()
    }

    try {
      const storedTenantId = getTenantId()
      if (storedTenantId && storedTenantId.trim()) {
        return storedTenantId.trim()
      }
    } catch (err) {
      console.error('Failed to get tenant_id from storage:', err)
    }

    if (user.id) {
      return user.id
    }

    return null
  }, [user, authLoading])

  const shouldRedirect = !tenantId && !authLoading && !user

  // ----- Form -----
  const produtoForm = useForm({
    resolver: zodResolver(produtoFormSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      preco: 0,
      disponivel: true,
      destaque: false,
      tempo_preparo: 30,
      categoria_id: '',
      imagem_url: ''
    }
  })

  // Populate form when editing
  useEffect(() => {
    if (editProduto?.id) {
      produtoForm.reset({
        nome: editProduto.nome || '',
        descricao: editProduto.descricao || '',
        preco: editProduto.preco ?? 0,
        disponivel: editProduto.disponivel ?? true,
        destaque: editProduto.destaque ?? false,
        tempo_preparo: editProduto.tempo_preparo ?? 30,
        categoria_id: editProduto.categoria_id || '',
        imagem_url: editProduto.imagem_url || ''
      })
      setImagePreview(editProduto.imagem_url || null)
    } else {
      produtoForm.reset({
        nome: '',
        descricao: '',
        preco: 0,
        disponivel: true,
        destaque: false,
        tempo_preparo: 30,
        categoria_id: '',
        imagem_url: ''
      })
      setImagePreview(null)
    }
  }, [editProduto, produtoForm])

  // ----- Data Fetching -----
  const fetchCategorias = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('categorias').select('*').eq('tenant_id', tenantId).order('ordem')
    if (data) setCategorias(data)
  }, [tenantId])

  const fetchProdutos = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('produtos').select('*').eq('tenant_id', tenantId).order('ordem')
    if (data) setProdutos(data)
  }, [tenantId])

  const fetchPrecos = useCallback(async () => {
    if (!tenantId) return
    const { data: precosData } = await supabase.from('precos_tamanho').select('*').eq('tenant_id', tenantId)
    if (precosData) setPrecos(precosData)
  }, [tenantId])

  const fetchPrecosDoProduto = useCallback(async (produtoId: string) => {
    if (!tenantId) return
    const { data } = await supabase.from('precos_tamanho').select('*').eq('tenant_id', tenantId).eq('produto_id', produtoId)
    if (data) setPrecos(data)
  }, [tenantId])

  const fetchSabores = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('sabores').select('*').eq('tenant_id', tenantId).order('nome')
    if (data) setSabores(data)
  }, [tenantId])

  const fetchSaboresDoProduto = useCallback(async (produtoId: string) => {
    if (!tenantId) return
    const { data } = await supabase.from('produto_sabores').select('sabor_id, sabores(id, nome, descricao, disponivel)').eq('produto_id', produtoId).eq('tenant_id', tenantId)
    if (data) {
      const saboresData = data
        .map(item => (item.sabores as unknown as Sabor) ?? null)
        .filter((s): s is Sabor => s !== null)
      setSelectedSabores(saboresData)
    }
  }, [tenantId])

  // Load all data on mount
  useEffect(() => {
    if (!tenantId) return
    const loadData = async () => {
      await Promise.all([fetchCategorias(), fetchProdutos(), fetchSabores()])
    }
    loadData()
  }, [tenantId, fetchCategorias, fetchProdutos, fetchSabores])

  // Load all prices and group by product
  useEffect(() => {
    if (!tenantId || produtos.length === 0) return
    const loadPrecos = async () => {
      const { data: precosData } = await supabase.from('precos_tamanho').select('*').eq('tenant_id', tenantId)
      if (precosData) {
        setPrecos(precosData)
        const grouped: Record<string, PrecoTamanho[]> = {}
        precosData.forEach(p => {
          if (!grouped[p.produto_id]) grouped[p.produto_id] = []
          grouped[p.produto_id].push(p)
        })
        setProdutoPrecos(grouped)
      }
    }
    loadPrecos()
  }, [tenantId, produtos.length])

  // Realtime
  useRealtime({
    configs: tenantId ? [
      { table: 'produtos', filter: `tenant_id=eq.${tenantId}`, callback: fetchProdutos }
    ] : []
  })

  // Redirect if no tenant
  useEffect(() => {
    if (shouldRedirect) {
      alert('Erro: tenant_id inválido ou não encontrado. Você será redirecionado para fazer login.')
      navigate('/admin/login', { replace: true })
    }
  }, [shouldRedirect, navigate])

  // ----- Actions: Categoria -----
  const saveCategoria = useCallback(async () => {
    if (!editCategoria?.nome) return
    const payload = { nome: editCategoria.nome, descricao: editCategoria.descricao || '' }
    const { error } = editCategoria.id
      ? await supabase.from('categorias').update(payload).eq('id', editCategoria.id).eq('tenant_id', tenantId)
      : await supabase.from('categorias').insert({ ...payload, ordem: categorias.length, tenant_id: tenantId })

    if (error) {
      console.error('Erro ao salvar categoria:', error)
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    setShowCategoriaModal(false)
    setEditCategoria(null)
    fetchCategorias()
  }, [editCategoria, tenantId, categorias.length, fetchCategorias])

  const deleteCategoria = useCallback(async (id: string) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchCategorias()
  }, [tenantId, fetchCategorias])

  const saveInlineCategoria = useCallback(async () => {
    if (!newCategoriaNome.trim()) return
    setSavingCategoria(true)
    const payload = { nome: newCategoriaNome.trim(), descricao: newCategoriaDescricao.trim() || '' }
    const { data, error } = await supabase.from('categorias').insert({ ...payload, ordem: categorias.length, tenant_id: tenantId }).select().single()
    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setSavingCategoria(false)
      return
    }
    produtoForm.setValue('categoria_id', data.id)
    setNewCategoriaNome('')
    setNewCategoriaDescricao('')
    setShowInlineCategoria(false)
    setSavingCategoria(false)
    fetchCategorias()
  }, [newCategoriaNome, newCategoriaDescricao, categorias.length, tenantId, produtoForm, fetchCategorias])

  const cancelInlineCategoria = useCallback(() => {
    setNewCategoriaNome('')
    setNewCategoriaDescricao('')
    setShowInlineCategoria(false)
  }, [])

  const handleDropCategoria = useCallback(async (e: React.DragEvent, targetId: string) => {
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
      supabase.from('categorias').update({ ordem: idx }).eq('id', c.id).eq('tenant_id', tenantId)
    )
    await Promise.all(updates)
  }, [draggedCategoria, categorias, tenantId])

  // ----- Actions: Photo -----
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const uploadPhoto = useCallback(async (produtoId: string): Promise<string | null> => {
    if (!selectedFile || !user) {
      alert('Erro: usuário não autenticado')
      return null
    }
    const tid = user.id
    const ext = selectedFile.name.split('.').pop() || 'jpg'
    const filePath = `${tid}/${produtoId}.${ext}`

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
  }, [selectedFile, user])

  const removePhoto = useCallback(() => {
    setSelectedFile(null)
    setImagePreview(null)
    setEditProduto(p => p ? { ...p, imagem_url: '' } : null)
  }, [])

  // ----- Actions: Complementos Temp -----
  const addTempComplemento = useCallback(() => {
    if (!newTamanho || !newPrecoValor) return
    const novo: ComplementoTemp = {
      id: `temp-${Date.now()}`,
      tamanho: newTamanho,
      preco: Number(newPrecoValor)
    }
    setTempComplementos([...tempComplementos, novo])
    setNewTamanho('')
    setNewPrecoValor('')
  }, [newTamanho, newPrecoValor, tempComplementos])

  const removeTempComplemento = useCallback((id: string) => {
    setTempComplementos(tempComplementos.filter(c => c.id !== id))
  }, [tempComplementos])

  // ----- Actions: Produto -----
  const saveTempComplementos = useCallback(async (produtoId: string) => {
    for (const comp of tempComplementos) {
      await supabase.from('precos_tamanho').insert({
        produto_id: produtoId,
        tamanho: comp.tamanho,
        preco: comp.preco,
        tenant_id: tenantId
      })
    }
  }, [tempComplementos, tenantId])

  const handleSaveProduto = useCallback(async (data: any) => {
    setUploading(true)
    const record: Record<string, any> = {
      nome: String(data.nome || ''),
      descricao: String(data.descricao || ''),
      categoria_id: data.categoria_id || null,
      disponivel: Boolean(data.disponivel),
      destaque: Boolean(data.destaque),
      tempo_preparo: Number(data.tempo_preparo) || 30,
      imagem_url: String(data.imagem_url || '')
    }
    const precoValue = Number(data.preco)
    if (precoValue > 0) {
      record.preco = precoValue
    }

    let produtoId = editProduto?.id
    const isNewProduct = !produtoId

    if (!produtoId) {
      const { data: insertData, error: insertError } = await supabase.from('produtos').insert({ ...record, ordem: produtos.length, tenant_id: tenantId }).select().single()
      if (insertError) {
        alert('Erro ao salvar: ' + insertError.message)
        setUploading(false)
        return
      }
      produtoId = insertData.id

      if (tempComplementos.length > 0 && produtoId) {
        await saveTempComplementos(produtoId)
      }

      if (selectedSabores.length > 0) {
        let flavorSaveFailed = false
        for (const sabor of selectedSabores) {
          try {
            const { error: flavorInsertError } = await supabase.from('produto_sabores').insert({
              produto_id: produtoId,
              sabor_id: sabor.id,
              tenant_id: tenantId
            })
            if (flavorInsertError) {
              console.error('Erro ao salvar flavor:', sabor.nome, 'ID:', sabor.id, 'Error:', flavorInsertError)
              flavorSaveFailed = true
            }
          } catch (err) {
            console.error('Exceção ao salvar flavor:', sabor.nome, 'ID:', sabor.id, 'Error:', err)
            flavorSaveFailed = true
          }
        }
        if (flavorSaveFailed) {
          alert('Alguns sabores não foram salvos. Verifique o console para detalhes.')
        }
      }
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
    setTempComplementos([])
    setNewTamanho('')
    setNewPrecoValor('')
    setShowProdutoModal(false)
    setEditProduto(null)
    setSelectedSabores([])
    setSelectedSaborId('')
    fetchProdutos()
    if (isNewProduct && produtoId) {
      fetchPrecosDoProduto(produtoId)
    }
  }, [editProduto, produtos.length, tenantId, tempComplementos, selectedSabores, selectedFile, saveTempComplementos, uploadPhoto, fetchProdutos, fetchPrecosDoProduto])

  const deleteProduto = useCallback(async (id: string) => {
    const { error } = await supabase.from('produtos').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchProdutos()
  }, [tenantId, fetchProdutos])

  const toggleDisponivel = useCallback(async (p: Produto) => {
    await supabase.from('produtos').update({ disponivel: !p.disponivel }).eq('id', p.id).eq('tenant_id', tenantId)
    fetchProdutos()
  }, [tenantId, fetchProdutos])

  // ----- Actions: Preco -----
  const addPreco = useCallback(async (produtoId: string) => {
    if (!newTamanho || !newPrecoValor) return
    const { error } = await supabase.from('precos_tamanho').insert({ produto_id: produtoId, tamanho: newTamanho, preco: Number(newPrecoValor), tenant_id: tenantId })
    if (error) {
      alert('Erro ao adicionar preço: ' + error.message)
    } else {
      setNewTamanho('')
      setNewPrecoValor('')
      fetchPrecosDoProduto(produtoId)
      fetchProdutos()
    }
  }, [newTamanho, newPrecoValor, tenantId, fetchPrecosDoProduto, fetchProdutos])

  const deletePreco = useCallback(async (precoId: string, produtoId: string) => {
    const { error } = await supabase.from('precos_tamanho').delete().eq('id', precoId).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir preço: ' + error.message)
    fetchPrecosDoProduto(produtoId)
    fetchProdutos()
  }, [tenantId, fetchPrecosDoProduto, fetchProdutos])

  // ----- Actions: Sabor -----
  const saveSabor = useCallback(async () => {
    if (!editSabor?.nome) return
    const payload = { nome: editSabor.nome, descricao: editSabor.descricao || '', disponivel: editSabor.disponivel ?? true }
    const { error } = editSabor.id
      ? await supabase.from('sabores').update(payload).eq('id', editSabor.id).eq('tenant_id', tenantId)
      : await supabase.from('sabores').insert({ ...payload, tenant_id: tenantId })

    if (error) {
      console.error('Erro ao salvar sabor:', error)
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    setShowSaborModal(false)
    setEditSabor(null)
    fetchSabores()
  }, [editSabor, tenantId, fetchSabores])

  const deleteSabor = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sabor?')) return
    const { error } = await supabase.from('sabores').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchSabores()
  }, [tenantId, fetchSabores])

  const toggleSaborDisponivel = useCallback(async (sabor: Sabor) => {
    await supabase.from('sabores').update({ disponivel: !sabor.disponivel }).eq('id', sabor.id).eq('tenant_id', tenantId)
    fetchSabores()
  }, [tenantId, fetchSabores])

  const saveInlineSabor = useCallback(async () => {
    if (!newSaborNome.trim()) return
    setSavingSabor(true)
    const payload = { nome: newSaborNome.trim(), descricao: newSaborDescricao.trim() || '', disponivel: true }

    const { data, error } = await supabase.from('sabores').insert({ ...payload, tenant_id: tenantId }).select().single()

    if (error) {
      console.error('saveInlineSabor: Erro ao salvar sabor:', error)
      setSavingSabor(false)
      return
    }

    if (!data || !data.id) {
      console.error('saveInlineSabor: Dados retornados estão vazios ou incompletos:', data)
      setSavingSabor(false)
      return
    }

    setSelectedSabores([...selectedSabores, data as Sabor])
    setSelectedSaborId(data.id)
    setNewSaborNome('')
    setNewSaborDescricao('')
    setShowInlineSabor(false)
    setSavingSabor(false)
    fetchSabores()
  }, [newSaborNome, newSaborDescricao, tenantId, selectedSabores, fetchSabores])

  const cancelInlineSabor = useCallback(() => {
    setNewSaborNome('')
    setNewSaborDescricao('')
    setShowInlineSabor(false)
  }, [])

  // ----- Actions: Produto ↔ Sabor -----
  const addSaborToProduto = useCallback(async () => {
    if (!selectedSaborId) return
    const saborToAdd = sabores.find(s => s.id === selectedSaborId)
    if (!saborToAdd) return

    if (selectedSabores.some(s => s.id === selectedSaborId)) {
      alert('Sabor já adicionado')
      return
    }

    if (editProduto?.id) {
      const { data: existingLink, error: queryError } = await supabase
        .from('produto_sabores')
        .select('id')
        .eq('produto_id', editProduto.id)
        .eq('sabor_id', selectedSaborId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (queryError) {
        console.error('Erro ao verificar sabor:', queryError)
        alert('Erro ao verificar sabor: ' + queryError.message)
        return
      }

      if (existingLink) {
        alert('Sabor já está associado a este produto')
        return
      }

      const { error } = await supabase.from('produto_sabores').insert({
        produto_id: editProduto.id,
        sabor_id: selectedSaborId,
        tenant_id: tenantId
      })

      if (error) {
        console.error('Erro ao adicionar sabor:', error)
        alert('Erro ao adicionar sabor: ' + error.message)
        return
      }
    }

    setSelectedSabores([...selectedSabores, saborToAdd])
    setSelectedSaborId('')
  }, [selectedSaborId, sabores, selectedSabores, editProduto, tenantId])

  const removeSaborFromProduto = useCallback(async (saborId: string) => {
    if (editProduto?.id) {
      const { error } = await supabase.from('produto_sabores').delete()
        .eq('produto_id', editProduto.id)
        .eq('sabor_id', saborId)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Erro ao remover sabor:', error)
        alert('Erro ao remover sabor: ' + error.message)
        return
      }
    }

    setSelectedSabores(selectedSabores.filter(s => s.id !== saborId))
  }, [editProduto, tenantId, selectedSabores])

  // ----- Open Produto Modal helpers -----
  const openNewProduto = useCallback(() => {
    setEditProduto({})
    setTempComplementos([])
    setNewTamanho('')
    setNewPrecoValor('')
    setShowProdutoModal(true)
    setSelectedSabores([])
  }, [])

  const openEditProduto = useCallback((p: Produto) => {
    setEditProduto(p)
    setTempComplementos([])
    setShowProdutoModal(true)
    setSelectedSabores([])
    fetchPrecosDoProduto(p.id)
    fetchSaboresDoProduto(p.id)
  }, [fetchPrecosDoProduto, fetchSaboresDoProduto])

  const closeProdutoModal = useCallback(() => {
    setShowProdutoModal(false)
    setSelectedFile(null)
    setImagePreview(null)
    setSelectedSabores([])
    setSelectedSaborId('')
  }, [])

  const openNewCategoria = useCallback(() => {
    setEditCategoria({})
    setShowCategoriaModal(true)
  }, [])

  const openNewSabor = useCallback(() => {
    setEditSabor({})
    setShowSaborModal(true)
  }, [])

  // ----- Delete preco from complementos tab -----
  const deletePrecoFromComplementos = useCallback(async (precoId: string) => {
    await supabase.from('precos_tamanho').delete().eq('id', precoId).eq('tenant_id', tenantId)
    fetchProdutos()
  }, [tenantId, fetchProdutos])

  return {
    // Auth & tenant
    authLoading,
    shouldRedirect,
    tenantId,

    // Data
    categorias,
    produtos,
    precos,
    produtoPrecos,
    sabores,

    // Tab
    tab,
    setTab,

    // Produto
    editProduto,
    showProdutoModal,
    selectedSabores,
    selectedSaborId,
    tempComplementos,
    newTamanho,
    newPrecoValor,
    selectedFile,
    imagePreview,
    uploading,
    produtoForm,

    // Produto setters
    setSelectedSaborId,
    setNewTamanho,
    setNewPrecoValor,
    setTempComplementos,
    setSelectedSabores,
    setShowProdutoModal,
    setEditProduto,

    // Inline Categoria
    showInlineCategoria,
    newCategoriaNome,
    newCategoriaDescricao,
    savingCategoria,
    setShowInlineCategoria,
    setNewCategoriaNome,
    setNewCategoriaDescricao,

    // Inline Sabor
    showInlineSabor,
    newSaborNome,
    newSaborDescricao,
    savingSabor,
    setShowInlineSabor,
    setNewSaborNome,
    setNewSaborDescricao,

    // Categoria Modal
    editCategoria,
    showCategoriaModal,
    setEditCategoria,
    setShowCategoriaModal,

    // Sabor Modal
    editSabor,
    showSaborModal,
    setEditSabor,
    setShowSaborModal,

    // Complementos Tab
    selectedProdutoComplementos,
    setSelectedProdutoComplementos,

    // Drag & Drop
    draggedCategoria,
    setDraggedCategoria,

    // Actions: Categoria
    saveCategoria,
    deleteCategoria,
    saveInlineCategoria,
    cancelInlineCategoria,
    handleDropCategoria,

    // Actions: Produto
    handleSaveProduto,
    deleteProduto,
    toggleDisponivel,
    openNewProduto,
    openEditProduto,
    closeProdutoModal,

    // Actions: Photo
    handleFileChange,
    removePhoto,

    // Actions: Complementos
    addTempComplemento,
    removeTempComplemento,
    addPreco,
    deletePreco,
    deletePrecoFromComplementos,

    // Actions: Sabor
    saveSabor,
    deleteSabor,
    toggleSaborDisponivel,
    saveInlineSabor,
    cancelInlineSabor,
    addSaborToProduto,
    removeSaborFromProduto,
    openNewSabor,
    openNewCategoria,

    // Fetch helpers
    fetchPrecosDoProduto,
    fetchSaboresDoProduto,
  }
}
