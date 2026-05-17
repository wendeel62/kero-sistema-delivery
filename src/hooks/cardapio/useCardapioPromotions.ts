/**
 * @hook useCardapioPromotions
 * @description Gerenciamento de sabores e associações produto↔sabor.
 * No domínio Kero, "sabores" são variações de produto (ex: meio-a-meio
 * em pizzas) e funcionam como promoções/variações do cardápio.
 */
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Sabor } from './types'

interface UseCardapioPromotionsOptions {
  tenantId: string | null
}

interface UseCardapioPromotionsReturn {
  /** Lista de todos os sabores do tenant */
  sabores: Sabor[]
  /** Sabores selecionados para o produto em edição */
  selectedSabores: Sabor[]
  /** ID do sabor selecionado no dropdown */
  selectedSaborId: string
  /** Busca todos os sabores do tenant */
  fetchSabores: () => Promise<void>
  /** Busca sabores associados a um produto específico */
  fetchSaboresDoProduto: (produtoId: string) => Promise<void>
  /** Salva (cria ou atualiza) um sabor */
  saveSabor: (editSabor: Partial<Sabor> | null) => Promise<string | null>
  /** Remove um sabor pelo ID */
  deleteSabor: (id: string) => Promise<void>
  /** Alterna disponibilidade de um sabor */
  toggleSaborDisponivel: (sabor: Sabor) => Promise<void>
  /** Criação inline de sabor — retorna o novo sabor criado */
  saveInlineSabor: (nome: string, descricao: string) => Promise<Sabor | null>
  /** Adiciona sabor ao produto em edição (local + Supabase se editando) */
  addSaborToProduto: (produtoId: string | undefined) => Promise<boolean>
  /** Remove sabor do produto em edição (local + Supabase se editando) */
  removeSaborFromProduto: (saborId: string, produtoId: string | undefined) => Promise<boolean>
  /** Setter para selectedSaborId */
  setSelectedSaborId: (id: string) => void
  /** Setter para selectedSabores (reset ao abrir/fechar modal) */
  setSelectedSabores: (sabores: Sabor[]) => void
}

export function useCardapioPromotions(
  options: UseCardapioPromotionsOptions
): UseCardapioPromotionsReturn {
  const { tenantId } = options

  const [sabores, setSabores] = useState<Sabor[]>([])
  const [selectedSabores, setSelectedSabores] = useState<Sabor[]>([])
  const [selectedSaborId, setSelectedSaborId] = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────

  const fetchSabores = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('sabores')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nome')
    if (data) setSabores(data)
  }, [tenantId])

  const fetchSaboresDoProduto = useCallback(
    async (produtoId: string) => {
      if (!tenantId) return
      const { data } = await supabase
        .from('produto_sabores')
        .select('sabor_id, sabores(id, nome, descricao, disponivel)')
        .eq('produto_id', produtoId)
        .eq('tenant_id', tenantId)
      if (data) {
        const saboresData = data
          .map((item) => (item.sabores as unknown as Sabor) ?? null)
          .filter((s): s is Sabor => s !== null)
        setSelectedSabores(saboresData)
      }
    },
    [tenantId]
  )

  // ── Actions ────────────────────────────────────────────────────────

  const saveSabor = useCallback(
    async (editSabor: Partial<Sabor> | null): Promise<string | null> => {
      if (!editSabor?.nome) return null
      const payload = {
        nome: editSabor.nome,
        descricao: editSabor.descricao || '',
        disponivel: editSabor.disponivel ?? true,
      }

      if (editSabor.id) {
        const { error } = await supabase
          .from('sabores')
          .update(payload)
          .eq('id', editSabor.id)
          .eq('tenant_id', tenantId)
        if (error) {
          console.error('Erro ao salvar sabor:', error)
          alert(`Erro ao salvar: ${error.message}`)
          return null
        }
      } else {
        const { error } = await supabase
          .from('sabores')
          .insert({ ...payload, tenant_id: tenantId })
        if (error) {
          console.error('Erro ao criar sabor:', error)
          alert(`Erro ao salvar: ${error.message}`)
          return null
        }
      }

      fetchSabores()
      return editSabor.id ?? null
    },
    [tenantId, fetchSabores]
  )

  const deleteSabor = useCallback(
    async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir este sabor?')) return
      const { error } = await supabase
        .from('sabores')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
      if (error) alert('Erro ao excluir: ' + error.message)
      fetchSabores()
    },
    [tenantId, fetchSabores]
  )

  const toggleSaborDisponivel = useCallback(
    async (sabor: Sabor) => {
      await supabase
        .from('sabores')
        .update({ disponivel: !sabor.disponivel })
        .eq('id', sabor.id)
        .eq('tenant_id', tenantId)
      fetchSabores()
    },
    [tenantId, fetchSabores]
  )

  const saveInlineSabor = useCallback(
    async (nome: string, descricao: string): Promise<Sabor | null> => {
      if (!nome.trim()) return null
      const payload = { nome: nome.trim(), descricao: descricao.trim() || '', disponivel: true }
      const { data, error } = await supabase
        .from('sabores')
        .insert({ ...payload, tenant_id: tenantId })
        .select()
        .single()
      if (error || !data?.id) {
        console.error('saveInlineSabor: Erro ao salvar sabor:', error)
        return null
      }
      fetchSabores()
      return data as Sabor
    },
    [tenantId, fetchSabores]
  )

  const addSaborToProduto = useCallback(
    async (produtoId: string | undefined): Promise<boolean> => {
      if (!selectedSaborId) return false
      const saborToAdd = sabores.find((s) => s.id === selectedSaborId)
      if (!saborToAdd) return false

      if (selectedSabores.some((s) => s.id === selectedSaborId)) {
        alert('Sabor já adicionado')
        return false
      }

      if (produtoId) {
        const { data: existingLink, error: queryError } = await supabase
          .from('produto_sabores')
          .select('id')
          .eq('produto_id', produtoId)
          .eq('sabor_id', selectedSaborId)
          .eq('tenant_id', tenantId)
          .maybeSingle()

        if (queryError) {
          console.error('Erro ao verificar sabor:', queryError)
          alert('Erro ao verificar sabor: ' + queryError.message)
          return false
        }
        if (existingLink) {
          alert('Sabor já está associado a este produto')
          return false
        }

        const { error } = await supabase.from('produto_sabores').insert({
          produto_id: produtoId,
          sabor_id: selectedSaborId,
          tenant_id: tenantId,
        })
        if (error) {
          console.error('Erro ao adicionar sabor:', error)
          alert('Erro ao adicionar sabor: ' + error.message)
          return false
        }
      }

      setSelectedSabores([...selectedSabores, saborToAdd])
      setSelectedSaborId('')
      return true
    },
    [selectedSaborId, sabores, selectedSabores, tenantId]
  )

  const removeSaborFromProduto = useCallback(
    async (saborId: string, produtoId: string | undefined): Promise<boolean> => {
      if (produtoId) {
        const { error } = await supabase
          .from('produto_sabores')
          .delete()
          .eq('produto_id', produtoId)
          .eq('sabor_id', saborId)
          .eq('tenant_id', tenantId)
        if (error) {
          console.error('Erro ao remover sabor:', error)
          alert('Erro ao remover sabor: ' + error.message)
          return false
        }
      }
      setSelectedSabores(selectedSabores.filter((s) => s.id !== saborId))
      return true
    },
    [tenantId, selectedSabores]
  )

  return {
    sabores,
    selectedSabores,
    selectedSaborId,
    fetchSabores,
    fetchSaboresDoProduto,
    saveSabor,
    deleteSabor,
    toggleSaborDisponivel,
    saveInlineSabor,
    addSaborToProduto,
    removeSaborFromProduto,
    setSelectedSaborId,
    setSelectedSabores,
  }
}
