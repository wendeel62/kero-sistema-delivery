/**
 * @hook useCardapioProducts
 * @description Gerenciamento de produtos do cardápio — CRUD, busca, filtros
 * e sincronização em tempo real via Supabase.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../useRealtime'
import type { Produto, PrecoTamanho } from './types'

interface UseCardapioProductsOptions {
  tenantId: string | null
}

interface UseCardapioProductsReturn {
  /** Lista de produtos do tenant */
  produtos: Produto[]
  /** Preços por tamanho (todos) */
  precos: PrecoTamanho[]
  /** Preços agrupados por produto_id */
  produtoPrecos: Record<string, PrecoTamanho[]>
  /** Busca produtos do tenant no Supabase */
  fetchProdutos: () => Promise<void>
  /** Busca preços de um produto específico */
  fetchPrecosDoProduto: (produtoId: string) => Promise<void>
  /** Remove um produto pelo ID */
  deleteProduto: (id: string) => Promise<void>
  /** Adiciona um preço por tamanho a um produto */
  addPreco: (produtoId: string, tamanho: string, precoValor: string) => Promise<void>
  /** Remove um preço por tamanho */
  deletePreco: (precoId: string, produtoId: string) => Promise<void>
  /** Remove um preço pela aba Complementos */
  deletePrecoFromComplementos: (precoId: string) => Promise<void>
  /** Salva complementos temporários no banco */
  saveTempComplementos: (
    produtoId: string,
    complementos: { tamanho: string; preco: number }[]
  ) => Promise<void>
}

export function useCardapioProducts(
  options: UseCardapioProductsOptions
): UseCardapioProductsReturn {
  const { tenantId } = options

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [precos, setPrecos] = useState<PrecoTamanho[]>([])
  const [produtoPrecos, setProdutoPrecos] = useState<Record<string, PrecoTamanho[]>>({})

  // ── Fetch ──────────────────────────────────────────────────────────

  const fetchProdutos = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('ordem')
    if (data) setProdutos(data)
  }, [tenantId])

  const fetchPrecosDoProduto = useCallback(async (produtoId: string) => {
    if (!tenantId) return
    const { data } = await supabase
      .from('precos_tamanho')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('produto_id', produtoId)
    if (data) setPrecos(data)
  }, [tenantId])

  // Carrega todos os preços e agrupa por produto quando os produtos mudam
  useEffect(() => {
    if (!tenantId || produtos.length === 0) return
    const loadPrecos = async () => {
      const { data: precosData } = await supabase
        .from('precos_tamanho')
        .select('*')
        .eq('tenant_id', tenantId)
      if (precosData) {
        setPrecos(precosData)
        const grouped: Record<string, PrecoTamanho[]> = {}
        precosData.forEach((p) => {
          if (!grouped[p.produto_id]) grouped[p.produto_id] = []
          grouped[p.produto_id].push(p)
        })
        setProdutoPrecos(grouped)
      }
    }
    loadPrecos()
  }, [tenantId, produtos.length])

  // ── Realtime ───────────────────────────────────────────────────────

  useRealtime({
    configs: tenantId
      ? [
          {
            table: 'produtos',
            filter: `tenant_id=eq.${tenantId}`,
            callback: fetchProdutos,
          },
        ]
      : [],
  })

  // ── Actions ────────────────────────────────────────────────────────

  const deleteProduto = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
      if (error) alert('Erro ao excluir: ' + error.message)
      fetchProdutos()
    },
    [tenantId, fetchProdutos]
  )

  const addPreco = useCallback(
    async (produtoId: string, tamanho: string, precoValor: string) => {
      if (!tamanho || !precoValor) return
      const { error } = await supabase
        .from('precos_tamanho')
        .insert({
          produto_id: produtoId,
          tamanho,
          preco: Number(precoValor),
          tenant_id: tenantId,
        })
      if (error) {
        alert('Erro ao adicionar preço: ' + error.message)
      } else {
        fetchPrecosDoProduto(produtoId)
        fetchProdutos()
      }
    },
    [tenantId, fetchPrecosDoProduto, fetchProdutos]
  )

  const deletePreco = useCallback(
    async (precoId: string, produtoId: string) => {
      const { error } = await supabase
        .from('precos_tamanho')
        .delete()
        .eq('id', precoId)
        .eq('tenant_id', tenantId)
      if (error) alert('Erro ao excluir preço: ' + error.message)
      fetchPrecosDoProduto(produtoId)
      fetchProdutos()
    },
    [tenantId, fetchPrecosDoProduto, fetchProdutos]
  )

  const deletePrecoFromComplementos = useCallback(
    async (precoId: string) => {
      await supabase
        .from('precos_tamanho')
        .delete()
        .eq('id', precoId)
        .eq('tenant_id', tenantId)
      fetchProdutos()
    },
    [tenantId, fetchProdutos]
  )

  const saveTempComplementos = useCallback(
    async (produtoId: string, complementos: { tamanho: string; preco: number }[]) => {
      for (const comp of complementos) {
        await supabase.from('precos_tamanho').insert({
          produto_id: produtoId,
          tamanho: comp.tamanho,
          preco: comp.preco,
          tenant_id: tenantId,
        })
      }
    },
    [tenantId]
  )

  return {
    produtos,
    precos,
    produtoPrecos,
    fetchProdutos,
    fetchPrecosDoProduto,
    deleteProduto,
    addPreco,
    deletePreco,
    deletePrecoFromComplementos,
    saveTempComplementos,
  }
}
