/**
 * @hook useCardapioCategories
 * @description Gerenciamento de categorias do cardápio — CRUD,
 * reordenação via drag & drop e criação inline.
 */
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Categoria } from './types'

interface UseCardapioCategoriesOptions {
  tenantId: string | null
}

interface UseCardapioCategoriesReturn {
  /** Lista de categorias do tenant */
  categorias: Categoria[]
  /** Busca categorias no Supabase */
  fetchCategorias: () => Promise<void>
  /** Salva (cria ou atualiza) uma categoria */
  saveCategoria: (editCategoria: Partial<Categoria> | null) => Promise<string | null>
  /** Remove uma categoria pelo ID */
  deleteCategoria: (id: string) => Promise<void>
  /** Salva categoria inline (criação rápida dentro do form de produto) */
  saveInlineCategoria: (
    nome: string,
    descricao: string
  ) => Promise<string | null>
  /** Reordena categorias via drag & drop */
  handleDropCategoria: (
    e: React.DragEvent,
    targetId: string,
    draggedCategoria: string | null
  ) => Promise<void>
}

export function useCardapioCategories(
  options: UseCardapioCategoriesOptions
): UseCardapioCategoriesReturn {
  const { tenantId } = options

  const [categorias, setCategorias] = useState<Categoria[]>([])

  // ── Fetch ──────────────────────────────────────────────────────────

  const fetchCategorias = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('ordem')
    if (data) setCategorias(data)
  }, [tenantId])

  // ── Actions ────────────────────────────────────────────────────────

  /** Cria ou atualiza categoria. Retorna o ID da categoria criada ou null. */
  const saveCategoria = useCallback(
    async (editCategoria: Partial<Categoria> | null): Promise<string | null> => {
      if (!editCategoria?.nome) return null
      const payload = { nome: editCategoria.nome, descricao: editCategoria.descricao || '' }

      if (editCategoria.id) {
        const { error } = await supabase
          .from('categorias')
          .update(payload)
          .eq('id', editCategoria.id)
          .eq('tenant_id', tenantId)
        if (error) {
          console.error('Erro ao salvar categoria:', error)
          alert(`Erro ao salvar: ${error.message}`)
          return null
        }
        fetchCategorias()
        return editCategoria.id
      }

      const { data, error } = await supabase
        .from('categorias')
        .insert({ ...payload, ordem: categorias.length, tenant_id: tenantId })
        .select()
        .single()
      if (error) {
        console.error('Erro ao criar categoria:', error)
        alert(`Erro ao salvar: ${error.message}`)
        return null
      }
      fetchCategorias()
      return data?.id ?? null
    },
    [tenantId, categorias.length, fetchCategorias]
  )

  const deleteCategoria = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
      if (error) alert('Erro ao excluir: ' + error.message)
      fetchCategorias()
    },
    [tenantId, fetchCategorias]
  )

  /** Criação inline — retorna o ID para associar ao form de produto */
  const saveInlineCategoria = useCallback(
    async (nome: string, descricao: string): Promise<string | null> => {
      if (!nome.trim()) return null
      const payload = { nome: nome.trim(), descricao: descricao.trim() || '' }
      const { data, error } = await supabase
        .from('categorias')
        .insert({ ...payload, ordem: categorias.length, tenant_id: tenantId })
        .select()
        .single()
      if (error) {
        alert('Erro ao salvar: ' + error.message)
        return null
      }
      fetchCategorias()
      return data?.id ?? null
    },
    [categorias.length, tenantId, fetchCategorias]
  )

  const handleDropCategoria = useCallback(
    async (e: React.DragEvent, targetId: string, draggedCategoria: string | null) => {
      e.preventDefault()
      if (!draggedCategoria || draggedCategoria === targetId) return

      const draggedIdx = categorias.findIndex((c) => c.id === draggedCategoria)
      const targetIdx = categorias.findIndex((c) => c.id === targetId)

      const novasCategorias = [...categorias]
      const [item] = novasCategorias.splice(draggedIdx, 1)
      novasCategorias.splice(targetIdx, 0, item)

      setCategorias(novasCategorias)

      const updates = novasCategorias.map((c, idx) =>
        supabase.from('categorias').update({ ordem: idx }).eq('id', c.id).eq('tenant_id', tenantId)
      )
      await Promise.all(updates)
    },
    [categorias, tenantId]
  )

  return {
    categorias,
    fetchCategorias,
    saveCategoria,
    deleteCategoria,
    saveInlineCategoria,
    handleDropCategoria,
  }
}
