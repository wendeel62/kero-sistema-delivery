import { useState, useCallback, useMemo } from 'react'
import type { Produto, Categoria } from './types'

export interface UseCardapioFiltersReturn {
  filtroCategoria: string | null
  busca: string
  filteredProdutos: Produto[]
  categorias: Categoria[]
  setFiltroCategoria: (categoria: string | null) => void
  setBusca: (busca: string) => void
  clearFiltros: () => void
  hasActiveFilters: boolean
}

export function useCardapioFilters(
  produtos: Produto[],
  categorias: Categoria[]
): UseCardapioFiltersReturn {
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const filteredProdutos = useMemo(() => {
    return produtos.filter(p => {
      // Filtro de categoria
      if (filtroCategoria && p.categoria_id !== filtroCategoria) {
        return false
      }

      // Filtro de busca
      if (busca) {
        const buscaLower = busca.toLowerCase()
        const matchNome = p.nome.toLowerCase().includes(buscaLower)
        const matchDescricao = p.descricao?.toLowerCase().includes(buscaLower)
        
        if (!matchNome && !matchDescricao) {
          return false
        }
      }

      return true
    })
  }, [produtos, filtroCategoria, busca])

  const clearFiltros = useCallback(() => {
    setFiltroCategoria(null)
    setBusca('')
  }, [])

  const hasActiveFilters = filtroCategoria !== null || busca !== ''

  return {
    filtroCategoria,
    busca,
    filteredProdutos,
    categorias,
    setFiltroCategoria,
    setBusca,
    clearFiltros,
    hasActiveFilters
  }
}
