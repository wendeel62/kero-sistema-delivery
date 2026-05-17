/**
 * @hook useCardapioAvailability
 * @description Gerencia disponibilidade de produtos e complementos
 * temporários. Centraliza toggles de disponibilidade e o estado
 * temporário de complementos antes da persistência.
 */
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ComplementoTemp, Produto } from './types'

interface UseCardapioAvailabilityOptions {
  tenantId: string | null
  fetchProdutos: () => Promise<void>
}

interface UseCardapioAvailabilityReturn {
  /** Complementos temporários (antes de salvar o produto) */
  tempComplementos: ComplementoTemp[]
  /** Valor do campo "novo tamanho" */
  newTamanho: string
  /** Valor do campo "novo preço" */
  newPrecoValor: string
  /** Alterna disponibilidade de um produto */
  toggleDisponivel: (p: Produto) => Promise<void>
  /** Adiciona complemento temporário à lista */
  addTempComplemento: () => void
  /** Remove complemento temporário pelo ID */
  removeTempComplemento: (id: string) => void
  /** Limpa todos os complementos temporários */
  clearTempComplementos: () => void
  /** Setter para newTamanho */
  setNewTamanho: (v: string) => void
  /** Setter para newPrecoValor */
  setNewPrecoValor: (v: string) => void
  /** Setter para tempComplementos */
  setTempComplementos: (comps: ComplementoTemp[]) => void
}

export function useCardapioAvailability(
  options: UseCardapioAvailabilityOptions
): UseCardapioAvailabilityReturn {
  const { tenantId, fetchProdutos } = options

  const [tempComplementos, setTempComplementos] = useState<ComplementoTemp[]>([])
  const [newTamanho, setNewTamanho] = useState('')
  const [newPrecoValor, setNewPrecoValor] = useState('')

  // ── Toggle disponibilidade ─────────────────────────────────────────

  const toggleDisponivel = useCallback(
    async (p: Produto) => {
      await supabase
        .from('produtos')
        .update({ disponivel: !p.disponivel })
        .eq('id', p.id)
        .eq('tenant_id', tenantId)
      fetchProdutos()
    },
    [tenantId, fetchProdutos]
  )

  // ── Complementos temporários ───────────────────────────────────────

  const addTempComplemento = useCallback(() => {
    if (!newTamanho || !newPrecoValor) return
    const novo: ComplementoTemp = {
      id: `temp-${Date.now()}`,
      tamanho: newTamanho,
      preco: Number(newPrecoValor),
    }
    setTempComplementos((prev) => [...prev, novo])
    setNewTamanho('')
    setNewPrecoValor('')
  }, [newTamanho, newPrecoValor])

  const removeTempComplemento = useCallback((id: string) => {
    setTempComplementos((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const clearTempComplementos = useCallback(() => {
    setTempComplementos([])
    setNewTamanho('')
    setNewPrecoValor('')
  }, [])

  return {
    tempComplementos,
    newTamanho,
    newPrecoValor,
    toggleDisponivel,
    addTempComplemento,
    removeTempComplemento,
    clearTempComplementos,
    setNewTamanho,
    setNewPrecoValor,
    setTempComplementos,
  }
}
