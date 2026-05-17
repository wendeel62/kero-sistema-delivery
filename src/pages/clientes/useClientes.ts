import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Cliente, ClienteFilters, ClienteStats } from './types'

export interface UseClientesReturn {
  clientes: Cliente[]
  filteredClientes: Cliente[]
  loading: boolean
  stats: ClienteStats
  filters: ClienteFilters
  setSearchTerm: (term: string) => void
  setFilterPerfil: (perfil: 'todos' | 'novo' | 'recorrente' | 'vip') => void
  refresh: () => Promise<void>
}

export function useClientes(tenantId: string | undefined): UseClientesReturn {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ClienteFilters>({
    searchTerm: '',
    filterPerfil: 'todos'
  })

  const fetchClientes = useCallback(async () => {
    if (!tenantId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nome', { ascending: true })

      if (error) {
        console.error('Erro ao buscar clientes:', error)
        return
      }

      // Atualiza perfil baseado em regras de negócio
      const updated = data?.map(c => {
        let perfil = c.perfil
        if (c.total_pedidos >= 10 || c.total_gasto >= 500) perfil = 'vip'
        else if (c.total_pedidos >= 3) perfil = 'recorrente'
        else perfil = 'novo'
        return { ...c, perfil }
      })

      setClientes(updated || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchesSearch = c.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        c.telefone.includes(filters.searchTerm)
      const matchesFilter = filters.filterPerfil === 'todos' || c.perfil === filters.filterPerfil
      return matchesSearch && matchesFilter
    })
  }, [clientes, filters])

  const stats: ClienteStats = useMemo(() => ({
    total: clientes.length,
    vip: clientes.filter(c => c.perfil === 'vip').length,
    recorrentes: clientes.filter(c => c.perfil === 'recorrente').length,
    novos: clientes.filter(c => c.perfil === 'novo').length
  }), [clientes])

  return {
    clientes,
    filteredClientes,
    loading,
    stats,
    filters,
    setSearchTerm: (searchTerm) => setFilters(prev => ({ ...prev, searchTerm })),
    setFilterPerfil: (filterPerfil) => setFilters(prev => ({ ...prev, filterPerfil })),
    refresh: fetchClientes
  }
}
