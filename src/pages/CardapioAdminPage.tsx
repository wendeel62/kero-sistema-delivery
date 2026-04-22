import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { produtoSchema, produtoFormSchema } from '../schemas/produtoSchema'

/**
 * Attempts to extract tenant_id from various possible storage locations and structures.
 * Includes comprehensive error logging for debugging auth token structure issues.
 */
function getTenantId(): string {
  const debugLog = (source: string, message: string, data?: unknown) => {
    console.log(`[getTenantId] ${source}: ${message}`, data ?? '')
  }
  const errorLog = (source: string, message: string, data?: unknown) => {
    console.error(`[getTenantId] ${source}: ${message}`, data ?? '')
  }

  // Helper function to extract tenant_id from a parsed auth token object
  const extractFromAuthToken = (tokenObj: unknown, source: string): string | null => {
    const data = tokenObj as Record<string, unknown> | undefined
    if (!data) {
      errorLog(source, 'Token object is null or undefined')
      return null
    }

    debugLog(source, 'Examining token structure', Object.keys(data))

    // Try various possible paths where tenant_id might be stored
    const possiblePaths = [
      // Path 1: access_token.user_metadata.tenant_id (Supabase v2 format)
      () => data.access_token?.user_metadata?.tenant_id as string | undefined,
      // Path 2: user.user_metadata.tenant_id (Supabase v1 format)
      () => data.user?.user_metadata?.tenant_id as string | undefined,
      // Path 3: access_token.tenant_id (alternative)
      () => data.access_token?.tenant_id as string | undefined,
      // Path 4: user.tenant_id (root level in user object)
      () => data.user?.tenant_id as string | undefined,
      // Path 5: tenant_id at root level
      () => data.tenant_id as string | undefined,
      // Path 6: metadata.tenant_id
      () => data.metadata?.tenant_id as string | undefined,
      // Path 7: session?.user?.user_metadata?.tenant_id (session wrapper)
      () => data.session?.user?.user_metadata?.tenant_id as string | undefined,
    ]

    for (const getValue of possiblePaths) {
      const value = getValue()
      if (value && typeof value === 'string' && value.trim()) {
        debugLog(source, `Found tenant_id at path`, value)
        return value.trim()
      }
    }

    errorLog(source, 'tenant_id not found in any expected path', possiblePaths.map((_, i) => `path_${i + 1}`))
    return null
  }

  // ====== 1. Check localStorage 'supabase.auth.token' ======
  const localTokenStr = localStorage.getItem('supabase.auth.token')
  if (localTokenStr) {
    debugLog('localStorage.supabase.auth.token', 'Found token, parsing...')
    try {
      const tokenObj = JSON.parse(localTokenStr)
      debugLog('localStorage.supabase.auth.token', 'Parsed successfully', typeof tokenObj)
      const tenantId = extractFromAuthToken(tokenObj, 'localStorage.supabase.auth.token')
      if (tenantId) return tenantId
    } catch (err) {
      errorLog('localStorage.supabase.auth.token', 'Failed to parse JSON', err instanceof Error ? err.message : String(err))
    }
  } else {
    debugLog('localStorage.supabase.auth.token', 'Not found')
  }

  // ====== 2. Check sessionStorage for various possible keys ======
  const sessionKeys = [
    'supabase.auth.token',
    'sb-auth-token',
    'supabase_session',
    'auth_token',
    'tenant_id'
  ]

  for (const key of sessionKeys) {
    const sessionValue = sessionStorage.getItem(key)
    if (sessionValue) {
      debugLog(`sessionStorage.${key}`, 'Found token, parsing...')
      try {
        const tokenObj = JSON.parse(sessionValue)
        debugLog(`sessionStorage.${key}`, 'Parsed successfully', typeof tokenObj)
        const tenantId = extractFromAuthToken(tokenObj, `sessionStorage.${key}`)
        if (tenantId) return tenantId
      } catch (err) {
        errorLog(`sessionStorage.${key}`, 'Failed to parse JSON', err instanceof Error ? err.message : String(err))
      }
    }
  }

  // ====== 3. Check custom localStorage keys that might have been used ======
  const customLocalKeys = [
    'tenant_id',
    'current_tenant_id',
    'sb-tenant-id',
    'auth_tenant_id',
    'user_tenant_id',
    'restaurant_id'
  ]

  for (const key of customLocalKeys) {
    const value = localStorage.getItem(key)
    if (value && value.trim()) {
      debugLog(`localStorage.${key}`, 'Found direct tenant_id value', value)
      return value.trim()
    }
    debugLog(`localStorage.${key}`, 'Not found or empty')
  }

  // ====== 4. Check sessionStorage for direct tenant_id ======
  const sessionDirectValue = sessionStorage.getItem('tenant_id')
  if (sessionDirectValue && sessionDirectValue.trim()) {
    debugLog('sessionStorage.tenant_id', 'Found direct tenant_id', sessionDirectValue)
    return sessionDirectValue.trim()
  }

  // ====== Debug: Log all available storage keys for troubleshooting ======
  const allLocalKeys = Object.keys(localStorage)
  const allSessionKeys = Object.keys(sessionStorage)
  debugLog('DEBUG', 'All localStorage keys', allLocalKeys)
  debugLog('DEBUG', 'All sessionStorage keys', allSessionKeys)

  // Log the structure of what we found for better debugging
  if (localTokenStr) {
    console.error('[getTenantId] DEBUG: Raw supabase.auth.token structure:', localTokenStr.substring(0, 500) + (localTokenStr.length > 500 ? '...[truncated]' : ''))
  }

  throw new Error('tenant_id not found in any storage location. Please log in again.')
}

interface Categoria { id: string; nome: string; descricao: string; ordem: number; ativo: boolean }
interface Produto { id: string; categoria_id: string; nome: string; descricao: string; preco: number | undefined; disponivel: boolean; destaque: boolean; tempo_preparo: number; imagem_url: string }
interface PrecoTamanho { id: string; produto_id: string; tamanho: string; preco: number }
interface Sabor { id: string; nome: string; descricao: string; disponivel: boolean }
interface ComplementoTemp { id?: string; tamanho: string; preco: number }

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
  const [selectedSabores, setSelectedSabores] = useState<Sabor[]>([])
  const [selectedSaborId, setSelectedSaborId] = useState('')
  const [selectedProdutoComplementos, setSelectedProdutoComplementos] = useState<Produto | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [tempComplementos, setTempComplementos] = useState<ComplementoTemp[]>([])
  // Inline category creation state
  const [showInlineCategoria, setShowInlineCategoria] = useState(false)
  const [newCategoriaNome, setNewCategoriaNome] = useState('')
  const [newCategoriaDescricao, setNewCategoriaDescricao] = useState('')
  const [savingCategoria, setSavingCategoria] = useState(false)
  // Inline flavor creation state
  const [showInlineSabor, setShowInlineSabor] = useState(false)
  const [newSaborNome, setNewSaborNome] = useState('')
  const [newSaborDescricao, setNewSaborDescricao] = useState('')
  const [savingSabor, setSavingSabor] = useState(false)

const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  // FIXED: Retrieve tenant_id with proper priority:
  // 1. First from user.user_metadata (auth context - most reliable)
  // 2. Fallback from localStorage
  // 3. Final fallback to user.id (user's own ID as tenant)
  // Note: This is called unconditionally so hooks order is preserved
  const tenantId = useMemo(() => {
    // If still loading auth, return null (will show loading state below)
    if (authLoading) {
      return null
    }
    
    // If no user, return null (will trigger redirect)
    if (!user) {
      return null
    }
    
    // 1. First try: user.user_metadata.tenant_id (Supabase v2 format from auth context)
    const userMetadataTenantId = user.user_metadata?.tenant_id
    if (userMetadataTenantId && typeof userMetadataTenantId === 'string' && userMetadataTenantId.trim()) {
      return userMetadataTenantId.trim()
    }
    
    // 2. Second try: get from localStorage
    try {
      const storedTenantId = getTenantId()
      if (storedTenantId && storedTenantId.trim()) {
        return storedTenantId.trim()
      }
    } catch (err) {
      console.error('Failed to get tenant_id from storage:', err)
    }
    
    // 3. Final fallback: use user's own ID as tenant_id
    // This allows the user to manage their own restaurant
    if (user.id) {
      console.log('[tenantId] Using user.id as fallback tenant_id:', user.id)
      return user.id
    }
    
    return null
  }, [user, authLoading])
  
  // FIXED: Compute redirect state - used for conditional rendering after all hooks
  const shouldRedirect = !tenantId && !authLoading && !user

  // Forms and callbacks - always defined but tenantId may be null
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

  // Populate form with editProduto data when editing an existing product
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
      // Reset form for new product
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
      const saboresData = data.map(item => item.sabores).filter(s => s !== null)
      setSelectedSabores(saboresData as Sabor[])
    }
  }, [tenantId])

  // FIXED: Proper useEffect with all dependencies included
  // This ensures data is loaded only when tenantId is valid and auth is ready
  useEffect(() => {
    // Skip if tenantId is not yet available (still loading)
    if (!tenantId) {
      return
    }
    
    const loadData = async () => {
      await Promise.all([fetchCategorias(), fetchProdutos(), fetchSabores()])
    }
    loadData()
  }, [tenantId, fetchCategorias, fetchProdutos, fetchSabores])

  // FIXED: Only initialize realtime subscription when tenantId is valid
  useRealtime({
    configs: tenantId ? [
      { table: 'produtos', filter: `tenant_id=eq.${tenantId}`, callback: fetchProdutos }
    ] : []
  })

  // FIXED: Handle redirect after all hooks are called
  useEffect(() => {
    if (shouldRedirect) {
      alert('Erro: tenant_id inválido ou não encontrado. Você será redirecionado para fazer login.')
      navigate('/admin/login', { replace: true })
    }
  }, [shouldRedirect, navigate])

  // FIXED: Render loading state or redirect after all hooks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#e8391a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }
  
  if (shouldRedirect) {
    return null
  }

  const saveCategoria = async () => {
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
  }

  const deleteCategoria = async (id: string) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchCategorias()
  }

  const saveInlineCategoria = async () => {
    if (!newCategoriaNome.trim()) return
    setSavingCategoria(true)
    const payload = { nome: newCategoriaNome.trim(), descricao: newCategoriaDescricao.trim() || '' }
    const { data, error } = await supabase.from('categorias').insert({ ...payload, ordem: categorias.length, tenant_id: tenantId }).select().single()
    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setSavingCategoria(false)
      return
    }
    // Update form with new category selected
    produtoForm.setValue('categoria_id', data.id)
    // Reset and close inline form
    setNewCategoriaNome('')
    setNewCategoriaDescricao('')
    setShowInlineCategoria(false)
    setSavingCategoria(false)
    fetchCategorias()
  }

  const cancelInlineCategoria = () => {
    setNewCategoriaNome('')
    setNewCategoriaDescricao('')
    setShowInlineCategoria(false)
  }

  const saveInlineSabor = async () => {
    if (!newSaborNome.trim()) return
    setSavingSabor(true)
    const payload = { nome: newSaborNome.trim(), descricao: newSaborDescricao.trim() || '', disponivel: true }
    console.log('saveInlineSabor: Inserting:', payload.nome)
    
    const { data, error } = await supabase.from('sabores').insert({ ...payload, tenant_id: tenantId }).select().single()
    
    if (error) {
      console.error('saveInlineSabor: Erro ao salvar sabor:', error)
      setSavingSabor(false)
      return
    }
    
    // Error handling: Verify flavor data was inserted correctly
    if (!data || !data.id) {
      console.error('saveInlineSabor: Dados retornados estão vazios ou incompletos:', data)
      setSavingSabor(false)
      return
    }
    
    if (!data.nome || !data.nome.trim()) {
      console.error('saveInlineSabor: Nome do sabor retornado está vazio:', data)
      setSavingSabor(false)
      return
    }
    
    console.log('saveInlineSabor: Sabor salvo com sucesso!', data.nome)
    
    // Add to selected sabores and select it
    setSelectedSabores([...selectedSabores, data as Sabor])
    setSelectedSaborId(data.id)
    
    // Reset and close inline form
    setNewSaborNome('')
    setNewSaborDescricao('')
    setShowInlineSabor(false)
    setSavingSabor(false)
    fetchSabores()
  }

  const cancelInlineSabor = () => {
    setNewSaborNome('')
    setNewSaborDescricao('')
    setShowInlineSabor(false)
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
      supabase.from('categorias').update({ ordem: idx }).eq('id', c.id).eq('tenant_id', tenantId)
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

  const addTempComplemento = () => {
    if (!newTamanho || !newPrecoValor) return
    const novo: ComplementoTemp = {
      id: `temp-${Date.now()}`,
      tamanho: newTamanho,
      preco: Number(newPrecoValor)
    }
    setTempComplementos([...tempComplementos, novo])
    setNewTamanho('')
    setNewPrecoValor('')
  }

  const removeTempComplemento = (id: string) => {
    setTempComplementos(tempComplementos.filter(c => c.id !== id))
  }

  // Shared save function for produto - used by form onSubmit and save button
  const handleSaveProduto = async (data: typeof produtoForm.getValues) => {
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
    const isNewProduct = !produtoId
    
    if (!produtoId) {
      const { data: insertData, error: insertError } = await supabase.from('produtos').insert({ ...record, ordem: produtos.length, tenant_id: tenantId }).select().single()
      if (insertError) {
        alert('Erro ao salvar: ' + insertError.message)
        setUploading(false)
        return
      }
      produtoId = insertData.id
      
      // Salvar complementos temporarios para novos produtos
      if (tempComplementos.length > 0) {
        await saveTempComplementos(produtoId)
      }
      
      // Salvar sabores selecionados para novos produtos
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
            } else {
              console.log('Flavor salvo com sucesso:', sabor.nome, 'ID:', sabor.id)
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
  }

  const saveTempComplementos = async (produtoId: string) => {
    for (const comp of tempComplementos) {
      await supabase.from('precos_tamanho').insert({
        produto_id: produtoId,
        tamanho: comp.tamanho,
        preco: comp.preco,
        tenant_id: tenantId
      })
    }
  }

  const deleteProduto = async (id: string) => {
    const { error } = await supabase.from('produtos').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchProdutos()
  }

  const toggleDisponivel = async (p: Produto) => {
    await supabase.from('produtos').update({ disponivel: !p.disponivel }).eq('id', p.id).eq('tenant_id', tenantId)
    fetchProdutos()
  }

  const addPreco = async (produtoId: string) => {
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
  }

  const deletePreco = async (precoId: string, produtoId: string) => {
    const { error } = await supabase.from('precos_tamanho').delete().eq('id', precoId).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir preço: ' + error.message)
    fetchPrecosDoProduto(produtoId)
    fetchProdutos()
  }

  const saveSabor = async () => {
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
  }

  const deleteSabor = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sabor?')) return
    const { error } = await supabase.from('sabores').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) alert('Erro ao excluir: ' + error.message)
    fetchSabores()
  }

  const toggleSaborDisponivel = async (sabor: Sabor) => {
    await supabase.from('sabores').update({ disponivel: !sabor.disponivel }).eq('id', sabor.id).eq('tenant_id', tenantId)
    fetchSabores()
  }

  const addSaborToProduto = async () => {
    if (!selectedSaborId) return
    const saborToAdd = sabores.find(s => s.id === selectedSaborId)
    if (!saborToAdd) return
    
    // Check if already selected in local state
    if (selectedSabores.some(s => s.id === selectedSaborId)) {
      alert('Sabor já adicionado')
      return
    }
    
    // For existing products, check database before inserting
    if (editProduto?.id) {
      // Verify the flavor is not already associated in the database
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
  }

  const removeSaborFromProduto = async (saborId: string) => {
    // For existing products, remove from database
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
          <button onClick={() => { setEditProduto({}); setTempComplementos([]); setNewTamanho(''); setNewPrecoValor(''); setShowProdutoModal(true); setSelectedSabores([]) }} className="mb-6 sm:mb-8 w-full sm:w-auto bg-[#e8391a] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-lg">add</span> Novo Produto
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produtos.map(p => (
              <div key={p.id} className={`bg-[#1a1a1a] rounded-2xl border border-[#252830] hover:border-[#e8391a]/20 transition-all group overflow-hidden flex flex-col ${!p.disponivel ? 'opacity-40 grayscale' : ''}`}>
                {/* Foto do produto */}
                {p.imagem_url && (
                  <div className="h-40 bg-[#252830] overflow-hidden">
                    <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                  </div>
                )}
                {!p.imagem_url && (
                  <div className="h-40 bg-[#252830] flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-gray-600">image</span>
                  </div>
                )}
                
                {/* Informações do produto */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-[Outfit] font-bold text-lg text-white">{p.nome}</h4>
                      <span className="text-[10px] font-bold text-[#e8391a] uppercase tracking-widest">
                        {categorias.find(c => c.id === p.categoria_id)?.nome || 'Sem Categoria'}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-emerald-400">
                      {produtoPrecos[p.id]?.length 
                        ? `R$ ${Math.min(...produtoPrecos[p.id].map(t => Number(t.preco))).toFixed(2)}` 
                        : (p.preco ? Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 flex-1 line-clamp-2">{p.descricao}</p>
                  
                  {/* Tamanhos disponíveis */}
                  {produtoPrecos[p.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {produtoPrecos[p.id].map((pt: any) => (
                        <span key={pt.id} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#252830] text-gray-300">
                          {pt.tamanho} - R$ {Number(pt.preco).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-[#252830]/50 -mx-5 px-5 pb-5 -mb-5 mt-auto">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditProduto(p); setTempComplementos([]); setShowProdutoModal(true); setSelectedSabores([]); fetchPrecosDoProduto(p.id); fetchSaboresDoProduto(p.id) }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all">
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
                        await supabase.from('precos_tamanho').delete().eq('id', pt.id).eq('tenant_id', tenantId)
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

      {/* Right Sidebar for Product Form */}
      {showProdutoModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[998] animate-fade-in" 
            onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); setSelectedSabores([]); setSelectedSaborId(''); }}
          />
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-auto z-[999] bg-[#16181f] shadow-2xl animate-slide-in-from-right w-full max-w-[600px] min-h-screen">
            <div className="flex items-center justify-between p-5 sm:p-8 border-b border-[#252830] sticky top-0 bg-[#16181f] z-10">
              <h3 className="font-headline text-xl sm:text-3xl font-bold text-white tracking-tight">{editProduto?.id ? 'Editar' : 'Novo'} Produto</h3>
              <button 
                onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); setSelectedSabores([]); setSelectedSaborId(''); }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#252830] text-gray-400 hover:text-white hover:bg-[#333] transition-all"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="p-5 sm:p-8 no-scrollbar">
            <div className="mb-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Foto do Produto</label>
              <div className="relative w-full max-w-[200px] aspect-[4/5] my-4">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="photo-input" disabled={uploading} />
                {(imagePreview || editProduto?.imagem_url) ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <img src={imagePreview || editProduto?.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={removePhoto} className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-all">
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
            <form onSubmit={produtoForm.handleSubmit(handleSaveProduto)} className="space-y-6">

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Nome do Produto</label>
                <input {...produtoForm.register('nome')} placeholder="Ex: Pizza Calabresa Especial" className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
                {produtoForm.formState.errors.nome && <span className="text-red-400 text-xs">{produtoForm.formState.errors.nome.message as string}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Descricao Detalhada</label>
                <textarea {...produtoForm.register('descricao')} placeholder="Descreva os ingredientes e detalhes" rows={3} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white resize-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Preco Base (R$) <span className="text-[10px] normal-case text-[#666]">- Opcional</span></label>
                  <input type="number" step="0.01" {...produtoForm.register('preco', { valueAsNumber: true })} placeholder="Ex: 25.00" className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#888] ml-1">Tempo (Min)</label>
                  <input type="number" {...produtoForm.register('tempo_preparo', { valueAsNumber: true })} className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ff5722] rounded-xl py-4 px-5 text-sm text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#ff5722] ml-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">category</span>
                  Categoria
                </label>
                {!showInlineCategoria ? (
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <select {...produtoForm.register('categoria_id')} className="w-full bg-[#1a1a1a] border-2 border-[#ff5722]/30 focus:border-[#ff5722] rounded-xl py-4 px-5 text-sm text-white cursor-pointer appearance-none">
                        <option value="">Selecione uma categoria</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#ff5722] pointer-events-none">expand_more</span>
                    </div>
                    <button type="button" onClick={() => setShowInlineCategoria(true)} className="bg-[#ff5722] text-white px-3 rounded-xl text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(255,86,55,0.3)] transition-all flex items-center gap-1" title="Criar nova categoria">
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#1a1a1a] border border-[#ff5722]/30 rounded-xl p-4 space-y-3">
                    <input
                      value={newCategoriaNome}
                      onChange={e => setNewCategoriaNome(e.target.value)}
                      placeholder="Nome da categoria"
                      className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500"
                      autoFocus
                    />
                    <input
                      value={newCategoriaDescricao}
                      onChange={e => setNewCategoriaDescricao(e.target.value)}
                      placeholder="Descricao (opcional)"
                      className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={cancelInlineCategoria} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-400 text-xs font-bold uppercase hover:bg-[#252830] transition-all">
                        Cancelar
                      </button>
                      <button type="button" onClick={saveInlineCategoria} disabled={savingCategoria || !newCategoriaNome.trim()} className="flex-1 py-2.5 rounded-lg bg-[#ff5722] text-white text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(255,86,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {savingCategoria ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                )}
                {produtoForm.watch('categoria_id') && !showInlineCategoria && (
                  <div className="mt-2 px-3 py-2 bg-[#ff5722]/10 rounded-lg flex items-center gap-2">
                    <span className="text-[10px] text-[#ff5722] uppercase tracking-widest font-bold">Categoria selecionada:</span>
                    <span className="text-sm text-white font-medium">{categorias.find(c => c.id === produtoForm.watch('categoria_id'))?.nome}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-8 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" {...produtoForm.register('disponivel')} className="hidden" />
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${produtoForm.watch('disponivel') ? 'bg-[#ff5722] border-[#ff5722]' : 'border-[#444]'}`}>
                    {produtoForm.watch('disponivel') && <span className="material-symbols-outlined text-white text-base">check</span>}
                  </div>
                  <span className="text-sm font-headline font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-white">Disponivel</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" {...produtoForm.register('destaque')} className="hidden" />
                   <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${produtoForm.watch('destaque') ? 'bg-[#ffc107] border-[#ffc107]' : 'border-[#444]'}`}>
                    {produtoForm.watch('destaque') && <span className="material-symbols-outlined text-black text-base">star</span>}
                  </div>
                  <span className="text-sm font-headline font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-[#ffc107]">Destaque</span>
                </label>
              </div>

              <div className="border-t border-[#333] pt-8 mt-4">
                <h4 className="text-xs font-headline font-bold uppercase tracking-[0.2em] mb-4 text-[#ffc107] flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">straighten</span>
                  Complementos (Tamanhos e Precos)
                </h4>
                <p className="text-xs text-gray-500 mb-4">Adicione os tamanhos e precos do produto. Ex: Pizza P, M, G, GG</p>
                
                {/* Exibir complementos existentes para produtos em edicao */}
                {editProduto?.id && precos.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ja cadastrados</p>
                    {precos.map(pt => (
                      <div key={pt.id} className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                        <span className="text-sm font-bold uppercase tracking-widest text-white">{pt.tamanho} -- <span className="text-[#4ade80]">R$ {Number(pt.preco).toFixed(2)}</span></span>
                        <button type="button" onClick={() => deletePreco(pt.id, editProduto.id!)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Exibir complementos temporarios para novos produtos */}
                {tempComplementos.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <p className="text-[10px] text-[#ffc107] uppercase tracking-widest">A serem cadastrados</p>
                    {tempComplementos.map(comp => (
                      <div key={comp.id} className="flex items-center justify-between bg-[#ffc107]/10 p-4 rounded-xl border border-[#ffc107]/30">
                        <span className="text-sm font-bold uppercase tracking-widest text-white">{comp.tamanho} -- <span className="text-[#4ade80]">R$ {Number(comp.preco).toFixed(2)}</span></span>
                        <button type="button" onClick={() => removeTempComplemento(comp.id!)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Formulario para adicionar novo complemento */}
                <div className="flex gap-3 mt-4">
                  <input value={newTamanho} onChange={e => setNewTamanho(e.target.value)} placeholder="Tamanho (Ex: P, M, G, GG)" className="flex-1 bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ffc107] rounded-xl py-3 px-4 text-xs text-white placeholder:text-gray-600" />
                  <input value={newPrecoValor} onChange={e => setNewPrecoValor(e.target.value)} type="number" step="0.01" placeholder="R$ 0,00" className="w-28 bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#ffc107] rounded-xl py-3 px-4 text-xs text-white placeholder:text-gray-600" />
                  <button type="button" onClick={editProduto?.id ? () => addPreco(editProduto.id!) : addTempComplemento} className="bg-[#ffc107] text-black px-4 rounded-xl text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(255,193,7,0.3)] transition-all">+</button>
                </div>
              </div>

              {showProdutoModal && (
                <div className="border-t border-[#333] pt-8 mt-4">
                  <h4 className="text-xs font-headline font-bold uppercase tracking-[0.2em] mb-4 text-[#8b5cf6] flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">icecream</span>
                    Sabores Disponiveis
                  </h4>
                  {sabores.length === 0 ? (
                    <p className="text-xs text-gray-500 mb-4">Nenhum sabor cadastrado. Cadastre sabores na aba Complementos para permitir meio a meio.</p>
                  ) : (
                    <p className="text-xs text-gray-500 mb-4">Selecione os sabores disponiveis para este produto.</p>
                  )}
                  
                  {/* Exibir sabores selecionados (para produtos em edicao ou novos) */}
                  {selectedSabores.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Selecionados</p>
                      {selectedSabores.map(sabor => (
                        <div key={sabor.id} className="flex items-center justify-between bg-[#8b5cf6]/10 p-4 rounded-xl border border-[#8b5cf6]/30">
                          <span className="text-sm font-bold text-white">{sabor.nome}</span>
                          <button type="button" onClick={() => removeSaborFromProduto(sabor.id)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Dropdown para adicionar novo sabor */}
                  {!showInlineSabor ? (
                    <div className="flex gap-3 mt-4">
                      <div className="flex-1 relative">
                        <select 
                          value={selectedSaborId} 
                          onChange={e => setSelectedSaborId(e.target.value)}
                          className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#8b5cf6] rounded-xl py-3 px-4 text-xs text-white appearance-none cursor-pointer"
                        >
                          <option value="">Selecione um sabor</option>
                          {sabores.filter(s => !selectedSabores.some(ss => ss.id === s.id)).map(sabor => (
                            <option key={sabor.id} value={sabor.id}>{sabor.nome}</option>
                          ))}
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#8b5cf6] pointer-events-none">expand_more</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={addSaborToProduto} 
                        disabled={!selectedSaborId}
                        className="bg-[#8b5cf6] text-white px-3 rounded-xl text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowInlineSabor(true)}
                        className="bg-[#252830] text-[#8b5cf6] px-3 rounded-xl text-xs font-bold uppercase hover:bg-[#333] transition-all flex items-center gap-1"
                        title="Criar novo sabor"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#1a1a1a] border border-[#8b5cf6]/30 rounded-xl p-4 space-y-3 mt-4">
                      <input
                        value={newSaborNome}
                        onChange={e => setNewSaborNome(e.target.value)}
                        placeholder="Nome do sabor"
                        className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500"
                        autoFocus
                      />
                      <input
                        value={newSaborDescricao}
                        onChange={e => setNewSaborDescricao(e.target.value)}
                        placeholder="Descricao (opcional)"
                        className="w-full bg-[#252830] border border-[#333] rounded-lg py-3 px-4 text-sm text-white placeholder:text-gray-500"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={cancelInlineSabor} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-400 text-xs font-bold uppercase hover:bg-[#252830] transition-all">
                          Cancelar
                        </button>
                        <button type="button" onClick={saveInlineSabor} disabled={savingSabor || !newSaborNome.trim()} className="flex-1 py-2.5 rounded-lg bg-[#8b5cf6] text-white text-xs font-bold uppercase hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          {savingSabor ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
                <div className="p-5 sm:p-8 border-t border-[#252830]">
                  <div className="flex gap-4">
                    <button type="button" onClick={() => { setShowProdutoModal(false); setSelectedFile(null); setImagePreview(null); }} className="flex-1 py-4 rounded-xl border border-[#333] text-[#888] font-headline font-bold text-xs uppercase tracking-widest hover:bg-[#1a1a1a] transition-all" disabled={uploading}>Cancelar</button>
                    <button type="submit" disabled={uploading} className="flex-1 py-4 rounded-xl bg-[#ff5722] text-white font-headline font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,86,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? 'Salvando...' : 'Salvar'}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
