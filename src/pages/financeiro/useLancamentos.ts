import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Lancamento, FiltroLancamentos, RelatorioFinanceiro } from './types'

export interface UseLancamentosReturn {
  lancamentos: Lancamento[]
  filteredLancamentos: Lancamento[]
  loading: boolean
  filters: FiltroLancamentos
  setFilter: (key: keyof FiltroLancamentos, value: any) => void
  refresh: () => Promise<void>
  addLancamento: (data: Partial<Lancamento>) => Promise<void>
  updateLancamento: (id: string, data: Partial<Lancamento>) => Promise<void>
  deleteLancamento: (id: string) => Promise<void>
  baixarBaixa: (id: string, data: Partial<Lancamento>) => Promise<void>
}

export function useLancamentos(tenantId: string | undefined): UseLancamentosReturn {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FiltroLancamentos>({
    dataInicio: new Date().toISOString().split('T')[0].slice(0, -3) + '-01',
    dataFim: new Date().toISOString().split('T')[0],
    categoria: undefined,
    status: undefined,
    formaPagamento: undefined,
    search: ''
  })

  const fetchLancamentos = useCallback(async () => {
    if (!tenantId) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('lancamentos')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('data_vencimento', filters.dataInicio)
        .lte('data_vencimento', filters.dataFim)
        .order('data_vencimento', { ascending: false })

      if (filters.categoria) {
        query = query.eq('categoria', filters.categoria)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.formaPagamento) {
        query = query.eq('forma_pagamento', filters.formaPagamento)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar lançamentos:', error)
        return
      }

      setLancamentos(data || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantId, filters])

  useEffect(() => {
    fetchLancamentos()
  }, [fetchLancamentos])

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(l => {
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const matchesSearch = l.descricao.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }
      return true
    })
  }, [lancamentos, filters])

  const addLancamento = async (data: Partial<Lancamento>) => {
    if (!tenantId) return
    await supabase.from('lancamentos').insert([{ ...data, tenant_id: tenantId }])
    await fetchLancamentos()
  }

  const updateLancamento = async (id: string, data: Partial<Lancamento>) => {
    if (!tenantId) return
    await supabase.from('lancamentos').update(data).eq('id', id).eq('tenant_id', tenantId)
    await fetchLancamentos()
  }

  const deleteLancamento = async (id: string) => {
    if (!tenantId) return
    await supabase.from('lancamentos').delete().eq('id', id).eq('tenant_id', tenantId)
    await fetchLancamentos()
  }

  const baixarBaixa = async (id: string, data: Partial<Lancamento>) => {
    if (!tenantId) return
    await supabase.from('lancamentos').update({
      status: 'pago',
      data_pagamento: new Date().toISOString(),
      ...data
    }).eq('id', id).eq('tenant_id', tenantId)
    await fetchLancamentos()
  }

  return {
    lancamentos,
    filteredLancamentos,
    loading,
    filters,
    setFilter: (key, value) => setFilters(prev => ({ ...prev, [key]: value })),
    refresh: fetchLancamentos,
    addLancamento,
    updateLancamento,
    deleteLancamento,
    baixarBaixa
  }
}
