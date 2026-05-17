/**
 * @hook useCardapioAdmin
 * @description Orquestrador do módulo Cardápio. Importa e combina
 * os hooks especializados, mantendo a mesma interface de retorno
 * para compatibilidade com os componentes existentes.
 *
 * Sub-hooks:
 * - useCardapioProducts   → CRUD de produtos e preços
 * - useCardapioCategories → CRUD de categorias e drag & drop
 * - useCardapioPromotions → Sabores e associações produto↔sabor
 * - useCardapioAvailability → Disponibilidade e complementos temp
 * - useCardapioUpload     → Upload de imagens
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../contexts/AuthContext'
import { getTenantId } from '../lib/getTenantId'
import { produtoFormSchema } from '../schemas/produtoSchema'

import { useCardapioProducts } from './cardapio/useCardapioProducts'
import { useCardapioCategories } from './cardapio/useCardapioCategories'
import { useCardapioPromotions } from './cardapio/useCardapioPromotions'
import { useCardapioAvailability } from './cardapio/useCardapioAvailability'
import { useCardapioUpload } from './cardapio/useCardapioUpload'
import { supabase } from '../lib/supabase'

// Re-export types from central location
export type { Categoria, Produto, PrecoTamanho, Sabor, ComplementoTemp } from './cardapio/types'

export function useCardapioAdmin() {
  // ── Auth & Tenant ──────────────────────────────────────────────────
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const tenantId = useMemo(() => {
    if (authLoading) return null
    if (!user) return null
    const meta = user.user_metadata?.tenant_id
    if (meta && typeof meta === 'string' && meta.trim()) return meta.trim()
    try {
      const stored = getTenantId()
      if (stored?.trim()) return stored.trim()
    } catch { /* fallback abaixo */ }
    return user.id || null
  }, [user, authLoading])

  const shouldRedirect = !tenantId && !authLoading && !user

  // ── Sub-hooks ──────────────────────────────────────────────────────
  const products = useCardapioProducts({ tenantId })
  const categories = useCardapioCategories({ tenantId })
  const promotions = useCardapioPromotions({ tenantId })
  const availability = useCardapioAvailability({
    tenantId,
    fetchProdutos: products.fetchProdutos,
  })
  const upload = useCardapioUpload({ user })

  // ── Tab state ──────────────────────────────────────────────────────
  const [tab, setTab] = useState<'categorias' | 'produtos' | 'complementos'>('produtos')

  // ── Produto UI state ───────────────────────────────────────────────
  const [editProduto, setEditProduto] = useState<Partial<import('./cardapio/types').Produto> | null>(null)
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [selectedProdutoComplementos, setSelectedProdutoComplementos] = useState<import('./cardapio/types').Produto | null>(null)

  // ── Categoria UI state ─────────────────────────────────────────────
  const [editCategoria, setEditCategoria] = useState<Partial<import('./cardapio/types').Categoria> | null>(null)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [showInlineCategoria, setShowInlineCategoria] = useState(false)
  const [newCategoriaNome, setNewCategoriaNome] = useState('')
  const [newCategoriaDescricao, setNewCategoriaDescricao] = useState('')
  const [savingCategoria, setSavingCategoria] = useState(false)

  // ── Sabor UI state ─────────────────────────────────────────────────
  const [editSabor, setEditSabor] = useState<Partial<import('./cardapio/types').Sabor> | null>(null)
  const [showSaborModal, setShowSaborModal] = useState(false)
  const [showInlineSabor, setShowInlineSabor] = useState(false)
  const [newSaborNome, setNewSaborNome] = useState('')
  const [newSaborDescricao, setNewSaborDescricao] = useState('')
  const [savingSabor, setSavingSabor] = useState(false)

  // ── Drag & Drop ────────────────────────────────────────────────────
  const [draggedCategoria, setDraggedCategoria] = useState<string | null>(null)

  // ── Form ───────────────────────────────────────────────────────────
  const produtoForm = useForm({
    resolver: zodResolver(produtoFormSchema),
    defaultValues: {
      nome: '', descricao: '', preco: 0,
      disponivel: true, destaque: false,
      tempo_preparo: 30, categoria_id: '', imagem_url: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (editProduto?.id) {
      produtoForm.reset({
        nome: editProduto.nome || '', descricao: editProduto.descricao || '',
        preco: editProduto.preco ?? 0, disponivel: editProduto.disponivel ?? true,
        destaque: editProduto.destaque ?? false,
        tempo_preparo: editProduto.tempo_preparo ?? 30,
        categoria_id: editProduto.categoria_id || '',
        imagem_url: editProduto.imagem_url || '',
      })
      upload.setImagePreview(editProduto.imagem_url || null)
    } else {
      produtoForm.reset({
        nome: '', descricao: '', preco: 0,
        disponivel: true, destaque: false,
        tempo_preparo: 30, categoria_id: '', imagem_url: '',
      })
      upload.setImagePreview(null)
    }
  }, [editProduto, produtoForm])

  // ── Initial data load ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return
    Promise.all([categories.fetchCategorias(), products.fetchProdutos(), promotions.fetchSabores()])
  }, [tenantId, categories.fetchCategorias, products.fetchProdutos, promotions.fetchSabores])

  // ── Redirect if no tenant ──────────────────────────────────────────
  useEffect(() => {
    if (shouldRedirect) {
      alert('Erro: tenant_id inválido ou não encontrado. Você será redirecionado para fazer login.')
      navigate('/admin/login', { replace: true })
    }
  }, [shouldRedirect, navigate])

  // ── Composite actions: Categoria ───────────────────────────────────
  const saveCategoria = useCallback(async () => {
    await categories.saveCategoria(editCategoria)
    setShowCategoriaModal(false)
    setEditCategoria(null)
  }, [editCategoria, categories])

  const saveInlineCategoria = useCallback(async () => {
    if (!newCategoriaNome.trim()) return
    setSavingCategoria(true)
    const id = await categories.saveInlineCategoria(newCategoriaNome, newCategoriaDescricao)
    if (id) produtoForm.setValue('categoria_id', id)
    setNewCategoriaNome('')
    setNewCategoriaDescricao('')
    setShowInlineCategoria(false)
    setSavingCategoria(false)
  }, [newCategoriaNome, newCategoriaDescricao, categories, produtoForm])

  const cancelInlineCategoria = useCallback(() => {
    setNewCategoriaNome('')
    setNewCategoriaDescricao('')
    setShowInlineCategoria(false)
  }, [])

  const handleDropCategoria = useCallback(
    (e: React.DragEvent, targetId: string) =>
      categories.handleDropCategoria(e, targetId, draggedCategoria),
    [categories, draggedCategoria]
  )

  // ── Composite actions: Sabor ───────────────────────────────────────
  const saveSabor = useCallback(async () => {
    await promotions.saveSabor(editSabor)
    setShowSaborModal(false)
    setEditSabor(null)
  }, [editSabor, promotions])

  const saveInlineSabor = useCallback(async () => {
    if (!newSaborNome.trim()) return
    setSavingSabor(true)
    const novoSabor = await promotions.saveInlineSabor(newSaborNome, newSaborDescricao)
    if (novoSabor) {
      promotions.setSelectedSabores([...promotions.selectedSabores, novoSabor])
      promotions.setSelectedSaborId(novoSabor.id)
    }
    setNewSaborNome('')
    setNewSaborDescricao('')
    setShowInlineSabor(false)
    setSavingSabor(false)
  }, [newSaborNome, newSaborDescricao, promotions])

  const cancelInlineSabor = useCallback(() => {
    setNewSaborNome('')
    setNewSaborDescricao('')
    setShowInlineSabor(false)
  }, [])

  const addSaborToProduto = useCallback(
    () => promotions.addSaborToProduto(editProduto?.id),
    [promotions, editProduto]
  )

  const removeSaborFromProduto = useCallback(
    (saborId: string) => promotions.removeSaborFromProduto(saborId, editProduto?.id),
    [promotions, editProduto]
  )

  // ── Composite actions: Produto save ────────────────────────────────
  const handleSaveProduto = useCallback(
    async (data: Record<string, unknown>) => {
      upload.setUploading(true)
      const record: Record<string, unknown> = {
        nome: String(data.nome || ''),
        descricao: String(data.descricao || ''),
        categoria_id: data.categoria_id || null,
        disponivel: Boolean(data.disponivel),
        destaque: Boolean(data.destaque),
        tempo_preparo: Number(data.tempo_preparo) || 30,
        imagem_url: String(data.imagem_url || ''),
      }
      const precoValue = Number(data.preco)
      if (precoValue > 0) record.preco = precoValue

      let produtoId = editProduto?.id
      const isNewProduct = !produtoId

      if (!produtoId) {
        const { data: insertData, error: insertError } = await supabase
          .from('produtos')
          .insert({ ...record, ordem: products.produtos.length, tenant_id: tenantId })
          .select().single()
        if (insertError) {
          alert('Erro ao salvar: ' + insertError.message)
          upload.setUploading(false)
          return
        }
        produtoId = insertData.id

        if (availability.tempComplementos.length > 0 && produtoId) {
          await products.saveTempComplementos(produtoId, availability.tempComplementos)
        }

        if (promotions.selectedSabores.length > 0) {
          let flavorSaveFailed = false
          for (const sabor of promotions.selectedSabores) {
            const { error: flavorInsertError } = await supabase
              .from('produto_sabores')
              .insert({ produto_id: produtoId, sabor_id: sabor.id, tenant_id: tenantId })
            if (flavorInsertError) flavorSaveFailed = true
          }
          if (flavorSaveFailed) alert('Alguns sabores não foram salvos.')
        }
      } else {
        const { error: updateError } = await supabase
          .from('produtos')
          .update(record)
          .eq('id', produtoId)
          .eq('tenant_id', tenantId)
        if (updateError) {
          alert('Erro ao salvar: ' + updateError.message)
          upload.setUploading(false)
          return
        }
      }

      if (upload.selectedFile && produtoId) {
        const imageUrl = await upload.uploadPhoto(produtoId)
        if (imageUrl) {
          await supabase.from('produtos').update({ imagem_url: imageUrl }).eq('id', produtoId).eq('tenant_id', tenantId)
        }
      }

      upload.setUploading(false)
      upload.setSelectedFile(null)
      upload.setImagePreview(null)
      availability.clearTempComplementos()
      setShowProdutoModal(false)
      setEditProduto(null)
      promotions.setSelectedSabores([])
      promotions.setSelectedSaborId('')
      products.fetchProdutos()
      if (isNewProduct && produtoId) products.fetchPrecosDoProduto(produtoId)
    },
    [editProduto, products, promotions, availability, upload, tenantId]
  )

  // ── Open/close helpers ─────────────────────────────────────────────
  const openNewProduto = useCallback(() => {
    setEditProduto({})
    availability.clearTempComplementos()
    setShowProdutoModal(true)
    promotions.setSelectedSabores([])
  }, [availability, promotions])

  const openEditProduto = useCallback(
    (p: import('./cardapio/types').Produto) => {
      setEditProduto(p)
      availability.setTempComplementos([])
      setShowProdutoModal(true)
      promotions.setSelectedSabores([])
      products.fetchPrecosDoProduto(p.id)
      promotions.fetchSaboresDoProduto(p.id)
    },
    [availability, promotions, products]
  )

  const closeProdutoModal = useCallback(() => {
    setShowProdutoModal(false)
    upload.setSelectedFile(null)
    upload.setImagePreview(null)
    promotions.setSelectedSabores([])
    promotions.setSelectedSaborId('')
  }, [upload, promotions])

  const openNewCategoria = useCallback(() => { setEditCategoria({}); setShowCategoriaModal(true) }, [])
  const openNewSabor = useCallback(() => { setEditSabor({}); setShowSaborModal(true) }, [])

  const addPreco = useCallback(
    (produtoId: string) => products.addPreco(produtoId, availability.newTamanho, availability.newPrecoValor),
    [products, availability]
  )

  const removePhoto = useCallback(
    () => upload.removePhoto((updater) => {
      setEditProduto((prev) => prev ? updater(prev as Record<string, unknown>) as typeof prev : null)
      return null as unknown as Record<string, unknown>
    }),
    [upload]
  )

  // ── Return (interface idêntica à original) ─────────────────────────
  return {
    authLoading, shouldRedirect, tenantId,
    categorias: categories.categorias,
    produtos: products.produtos,
    precos: products.precos,
    produtoPrecos: products.produtoPrecos,
    sabores: promotions.sabores,
    tab, setTab,
    editProduto, showProdutoModal,
    selectedSabores: promotions.selectedSabores,
    selectedSaborId: promotions.selectedSaborId,
    tempComplementos: availability.tempComplementos,
    newTamanho: availability.newTamanho,
    newPrecoValor: availability.newPrecoValor,
    selectedFile: upload.selectedFile,
    imagePreview: upload.imagePreview,
    uploading: upload.uploading,
    produtoForm,
    setSelectedSaborId: promotions.setSelectedSaborId,
    setNewTamanho: availability.setNewTamanho,
    setNewPrecoValor: availability.setNewPrecoValor,
    setTempComplementos: availability.setTempComplementos,
    setSelectedSabores: promotions.setSelectedSabores,
    setShowProdutoModal, setEditProduto,
    showInlineCategoria, newCategoriaNome, newCategoriaDescricao, savingCategoria,
    setShowInlineCategoria, setNewCategoriaNome, setNewCategoriaDescricao,
    showInlineSabor, newSaborNome, newSaborDescricao, savingSabor,
    setShowInlineSabor, setNewSaborNome, setNewSaborDescricao,
    editCategoria, showCategoriaModal, setEditCategoria, setShowCategoriaModal,
    editSabor, showSaborModal, setEditSabor, setShowSaborModal,
    selectedProdutoComplementos, setSelectedProdutoComplementos,
    draggedCategoria, setDraggedCategoria,
    saveCategoria, deleteCategoria: categories.deleteCategoria,
    saveInlineCategoria, cancelInlineCategoria, handleDropCategoria,
    handleSaveProduto, deleteProduto: products.deleteProduto,
    toggleDisponivel: availability.toggleDisponivel,
    openNewProduto, openEditProduto, closeProdutoModal,
    handleFileChange: upload.handleFileChange, removePhoto,
    addTempComplemento: availability.addTempComplemento,
    removeTempComplemento: availability.removeTempComplemento,
    addPreco, deletePreco: products.deletePreco,
    deletePrecoFromComplementos: products.deletePrecoFromComplementos,
    saveSabor, deleteSabor: promotions.deleteSabor,
    toggleSaborDisponivel: promotions.toggleSaborDisponivel,
    saveInlineSabor, cancelInlineSabor,
    addSaborToProduto, removeSaborFromProduto,
    openNewSabor, openNewCategoria,
    fetchPrecosDoProduto: products.fetchPrecosDoProduto,
    fetchSaboresDoProduto: promotions.fetchSaboresDoProduto,
  }
}
