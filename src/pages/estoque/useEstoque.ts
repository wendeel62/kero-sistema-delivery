import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { handleSupabaseError } from '../../lib/supabaseErrorHandler'
import { logger } from '../../utils/logger'
import { ESTOQUE_CONFIG } from '../../constants'
import type { Ingrediente, EstoqueStats, FiltroEstoque, MovimentacaoEstoque } from './types'

export interface UseEstoqueReturn {
  ingredientes: Ingrediente[]
  filteredIngredientes: Ingrediente[]
  loading: boolean
  stats: EstoqueStats
  filters: FiltroEstoque
  setFilter: <K extends keyof FiltroEstoque>(key: K, value: FiltroEstoque[K]) => void
  refresh: () => Promise<void>
  addIngrediente: (data: Partial<Ingrediente>) => Promise<boolean>
  updateIngrediente: (id: string, data: Partial<Ingrediente>) => Promise<boolean>
  deleteIngrediente: (id: string) => Promise<boolean>
  registrarEntrada: (data: Partial<MovimentacaoEstoque>) => Promise<boolean>
  registrarSaida: (data: Partial<MovimentacaoEstoque>) => Promise<boolean>
}

export function useEstoque(tenantId: string | undefined): UseEstoqueReturn {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FiltroEstoque>({
    searchTerm: '',
    categoria: '',
    deposito: undefined,
    apenasBaixo: false,
    apenasVencimento: false
  })

  const fetchIngredientes = useCallback(async () => {
    if (!tenantId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ingredientes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nome', { ascending: true })

      if (handleSupabaseError(error, 'useEstoque.fetchIngredientes')) return

      setIngredientes(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('[useEstoque] Unexpected error', { message })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchIngredientes()
  }, [fetchIngredientes])

  const filteredIngredientes = useMemo(() => {
    return ingredientes.filter(i => {
      const matchesSearch = i.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        i.categoria.toLowerCase().includes(filters.searchTerm.toLowerCase())

      const matchesCategoria = !filters.categoria || i.categoria === filters.categoria

      const matchesBaixo = !filters.apenasBaixo || i.estoque_atual <= i.estoque_minimo

      let matchesVencimento = true
      if (filters.apenasVencimento && i.validade) {
        const now = new Date()
        const validade = new Date(i.validade)
        const diffDays = (validade.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        matchesVencimento = diffDays <= ESTOQUE_CONFIG.ALERTA_VENCIMENTO_DIAS
      }

      return matchesSearch && matchesCategoria && matchesBaixo && matchesVencimento
    })
  }, [ingredientes, filters])

  const stats: EstoqueStats = useMemo(() => ({
    total: ingredientes.length,
    critico: ingredientes.filter(i => i.estoque_atual <= i.estoque_critico).length,
    baixo: ingredientes.filter(i => i.estoque_atual > i.estoque_critico && i.estoque_atual <= i.estoque_minimo).length,
    valor_total: ingredientes.reduce((acc, i) => acc + (i.estoque_atual * i.custo_medio), 0),
    vencimentos_proximos: ingredientes.filter(i => {
      if (!i.validade) return false
      const now = new Date()
      const validade = new Date(i.validade)
      const diffDays = (validade.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays <= ESTOQUE_CONFIG.ALERTA_VENCIMENTO_DIAS
    }).length
  }), [ingredientes])

  const addIngrediente = async (data: Partial<Ingrediente>): Promise<boolean> => {
    if (!tenantId) return true
    return handleSupabaseError(
      (await supabase.from('ingredientes').insert([{ ...data, tenant_id: tenantId }])).error,
      'useEstoque.addIngrediente'
    ) || (await fetchIngredientes(), false)
  }

  const updateIngrediente = async (id: string, data: Partial<Ingrediente>): Promise<boolean> => {
    if (!tenantId) return true
    return handleSupabaseError(
      (await supabase.from('ingredientes').update(data).eq('id', id).eq('tenant_id', tenantId)).error,
      'useEstoque.updateIngrediente'
    ) || (await fetchIngredientes(), false)
  }

  const deleteIngrediente = async (id: string): Promise<boolean> => {
    if (!tenantId) return true
    return handleSupabaseError(
      (await supabase.from('ingredientes').delete().eq('id', id).eq('tenant_id', tenantId)).error,
      'useEstoque.deleteIngrediente'
    ) || (await fetchIngredientes(), false)
  }

  const registrarEntrada = async (data: Partial<MovimentacaoEstoque>): Promise<boolean> => {
    if (!tenantId) return true
    return handleSupabaseError(
      (await supabase.from('entradas_estoque').insert([{ ...data, tenant_id: tenantId }])).error,
      'useEstoque.registrarEntrada'
    ) || (await fetchIngredientes(), false)
  }

  const registrarSaida = async (data: Partial<MovimentacaoEstoque>): Promise<boolean> => {
    if (!tenantId) return true
    return handleSupabaseError(
      (await supabase.from('saidas_estoque').insert([{ ...data, tenant_id: tenantId }])).error,
      'useEstoque.registrarSaida'
    ) || (await fetchIngredientes(), false)
  }

  return {
    ingredientes,
    filteredIngredientes,
    loading,
    stats,
    filters,
    setFilter: (key, value) => setFilters(prev => ({ ...prev, [key]: value })),
    refresh: fetchIngredientes,
    addIngrediente,
    updateIngrediente,
    deleteIngrediente,
    registrarEntrada,
    registrarSaida
  }
}
