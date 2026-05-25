import { useCallback, useMemo } from 'react'
import type { Produto } from '../pages/CardapioOnlinePage'
import type { Mesa, PrecoTamanho, ItemPedido } from './usePdv'

// ============================================
// TYPES
// ============================================

export interface UsePdvUiReturn {
  // Filtered products
  filteredProdutos: Produto[]

  // Filter actions
  handleSetFiltro: (categoriaId: string | null) => void
  handleSetBusca: (busca: string) => void

  // Status color helper
  getStatusColor: (status: string) => string

  // Mesa click handlers
  handleMesaClick: (mesa: Mesa) => void
  handleMesaFecharClick: (mesa: Mesa) => void

  // Cart helpers
  subtotal: number
  total: number
  cartItemCount: number

  // Validation helpers
  isProdutoDisponivel: (produto: Produto) => boolean
  getPrecoProduto: (produto: Produto, precosTamanho: Record<string, PrecoTamanho[]>) => number | null
}

export interface UsePdvUiDeps {
  produtos: Produto[]
  precosTamanho: Record<string, PrecoTamanho[]>
  filtro: string | null
  busca: string
  itens: ItemPedido[]
  desconto: number
  onAddItem: (p: Produto, precosTamanho: Record<string, PrecoTamanho[]>) => void
  onLoadMesaItens: (mesa: Mesa) => Promise<void>
  onSetMesaFechar: (mesa: Mesa) => void
  onSetShowDivisaoConta: (show: boolean) => void
}

// ============================================
// HOOK
// ============================================

export function usePdvUI({
  produtos,
  precosTamanho: _precosTamanho,
  filtro,
  busca,
  itens,
  desconto,
  onAddItem: _onAddItem,
  onLoadMesaItens,
  onSetMesaFechar,
  onSetShowDivisaoConta
}: UsePdvUiDeps) {
  // ----- Filtered Products -----
  const filteredProdutos = useMemo(() => {
    return produtos.filter(p => {
      if (filtro && p.categoria_id !== filtro) return false
      if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
      return true
    })
  }, [produtos, filtro, busca])

  // ----- Filter Actions -----
  const handleSetFiltro = useCallback((_categoriaId: string | null) => {
    // Filter logic is handled by the filter state
  }, [])

  const handleSetBusca = useCallback((_busca: string) => {
    // Search logic is handled by the busca state
  }, [])

  // ----- Status Color Helper -----
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'livre':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
      case 'ocupada':
        return 'border-[#e8391a]/40 bg-[#e8391a]/10 text-[#e8391a]'
      case 'aguardando_pagamento':
        return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
      case 'inativa':
        return 'border-gray-600 bg-gray-600/10 text-gray-400'
      default:
        return 'border-gray-600 bg-gray-600/10 text-gray-400'
    }
  }, [])

  // ----- Mesa Click Handlers -----
  const handleMesaClick = useCallback(async (mesa: Mesa) => {
    if (mesa.status === 'livre') {
      // Will be handled by parent component
      return
    } else if (mesa.status === 'ocupada' || mesa.status === 'aguardando_pagamento') {
      await onLoadMesaItens(mesa)
      onSetMesaFechar(mesa)
      onSetShowDivisaoConta(true)
    }
  }, [onLoadMesaItens, onSetMesaFechar, onSetShowDivisaoConta])

  const handleMesaFecharClick = useCallback(async (mesa: Mesa) => {
    await onLoadMesaItens(mesa)
    onSetMesaFechar(mesa)
    onSetShowDivisaoConta(true)
  }, [onLoadMesaItens, onSetMesaFechar, onSetShowDivisaoConta])

  // ----- Cart Helpers -----
  const subtotal = useMemo(() => {
    return itens.reduce((sum, i) => sum + Number(i.produto.preco) * i.quantidade, 0)
  }, [itens])

  const total = useMemo(() => {
    return Math.max(0, subtotal - desconto)
  }, [subtotal, desconto])

  const cartItemCount = useMemo(() => {
    return itens.reduce((sum, i) => sum + i.quantidade, 0)
  }, [itens])

  // ----- Validation Helpers -----
  const isProdutoDisponivel = useCallback((produto: Produto) => {
    return produto.disponivel !== false
  }, [])

  const getPrecoProduto = useCallback((produto: Produto, precosTamanho: Record<string, PrecoTamanho[]>) => {
    const variants = precosTamanho[produto.id]
    if (variants && variants.length > 0) {
      return variants[0].preco
    }
    return produto.preco ? Number(produto.preco) : null
  }, [])

  return {
    filteredProdutos,
    handleSetFiltro,
    handleSetBusca,
    getStatusColor,
    handleMesaClick,
    handleMesaFecharClick,
    subtotal,
    total,
    cartItemCount,
    isProdutoDisponivel,
    getPrecoProduto
  }
}
