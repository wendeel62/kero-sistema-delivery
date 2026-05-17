import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Ingrediente, EstoqueStats, FiltroEstoque, MovimentacaoEstoque } from './types'

export interface UseEstoqueReturn {
  ingredientes: Ingrediente[]
  filteredIngredientes: Ingrediente[]
  loading: boolean
  stats: EstoqueStats
  filters: FiltroEstoque
  setFilter: (key: keyof FiltroEstoque, value: any) => void
  refresh: () => Promise<void>
  addIngrediente: (data: Partial<Ingrediente>) => Promise<void>
  updateIngrediente: (id: string, data: Partial<Ingrediente>) => Promise<void>
  deleteIngrediente: (id: string) => Promise<void>
  registrarEntrada: (data: Partial<MovimentacaoEstoque>) => Promise<void>
  registrarSaida: (data: Partial<MovimentacaoEstoque>) => Promise<void>
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

      if (error) {
        console.error('Erro ao buscar ingredientes:', error)
        return
      }

      setIngredientes(data || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchIngredientes()
  }, [fetchIngredientes])

  const filteredIngredientes = useMemo(() => {
    return ingredientes.filter(i => {
      // Filtro de busca
      const matchesSearch = i.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        i.categoria.toLowerCase().includes(filters.searchTerm.toLowerCase())
      
      // Filtro de categoria
      const matchesCategoria = !filters.categoria || i.categoria === filters.categoria
      
      // Filtro de estoque baixo
      const matchesBaixo = !filters.apenasBaixo || i.estoque_atual <= i.estoque_minimo
      
      // Filtro de vencimento próximo
      let matchesVencimento = true
      if (filters.apenasVencimento && i.validade) {
        const now = new Date()
        const validade = new Date(i.validade)
        const diffDays = (validade.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        matchesVencimento = diffDays <= 7 // Vencimento em 7 dias
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
      return diffDays <= 7
    }).length
  }), [ingredientes])

  const addIngrediente = async (data: Partial<Ingrediente>) => {
    if (!tenantId) return
    await supabase.from('ingredientes').insert([{ ...data, tenant_id: tenantId }])
    await fetchIngredientes()
  }

  const updateIngrediente = async (id: string, data: Partial<Ingrediente>) => {
    if (!tenantId) return
    await supabase.from('ingredientes').update(data).eq('id', id).eq('tenant_id', tenantId)
    await fetchIngredientes()
  }

  const deleteIngrediente = async (id: string) => {
    if (!tenantId) return
    await supabase.from('ingredientes').delete().eq('id', id).eq('tenant_id', tenantId)
    await fetchIngredientes()
  }

  const registrarEntrada = async (data: Partial<MovimentacaoEstoque>) => {
    if (!tenantId) return
    await supabase.from('entradas_estoque').insert([{ ...data, tenant_id: tenantId }])
    await fetchIngredientes()
  }

  const registrarSaida = async (data: Partial<MovimentacaoEstoque>) => {
    if (!tenantId) return
    await supabase.from('saidas_estoque').insert([{ ...data, tenant_id: tenantId }])
    await fetchIngredientes()
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
