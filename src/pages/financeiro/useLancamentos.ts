import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { handleSupabaseError } from '../../lib/supabaseErrorHandler'
import { logger } from '../../utils/logger'
import type { Lancamento, FiltroLancamentos } from './types'

export interface UseLancamentosReturn {
  lancamentos: Lancamento[]
  filteredLancamentos: Lancamento[]
  loading: boolean
  filters: FiltroLancamentos
  setFilter: <K extends keyof FiltroLancamentos>(key: K, value: FiltroLancamentos[K]) => void
  refresh: () => Promise<void>
  addLancamento: (data: Partial<Lancamento>) => Promise<boolean>
  updateLancamento: (id: string, data: Partial<Lancamento>) => Promise<boolean>
  deleteLancamento: (id: string) => Promise<boolean>
  baixarBaixa: (id: string, data?: Partial<Lancamento>) => Promise<boolean>
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

      if (handleSupabaseError(error, 'useLancamentos.fetchLancamentos')) return

      setLancamentos(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('[useLancamentos] Unexpected error', { message })
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

  const addLancamento = async (data: Partial<Lancamento>): Promise<boolean> => {
    if (!tenantId) return true
    const hasError = handleSupabaseError(
      (await supabase.from('lancamentos').insert([{ ...data, tenant_id: tenantId }])).error,
      'useLancamentos.addLancamento'
    )
    if (!hasError) await fetchLancamentos()
    return hasError
  }

  const updateLancamento = async (id: string, data: Partial<Lancamento>): Promise<boolean> => {
    if (!tenantId) return true
    const hasError = handleSupabaseError(
      (await supabase.from('lancamentos').update(data).eq('id', id).eq('tenant_id', tenantId)).error,
      'useLancamentos.updateLancamento'
    )
    if (!hasError) await fetchLancamentos()
    return hasError
  }

  const deleteLancamento = async (id: string): Promise<boolean> => {
    if (!tenantId) return true
    const hasError = handleSupabaseError(
      (await supabase.from('lancamentos').delete().eq('id', id).eq('tenant_id', tenantId)).error,
      'useLancamentos.deleteLancamento'
    )
    if (!hasError) await fetchLancamentos()
    return hasError
  }

  const baixarBaixa = async (id: string, data?: Partial<Lancamento>): Promise<boolean> => {
    if (!tenantId) return true
    const hasError = handleSupabaseError(
      (await supabase.from('lancamentos').update({
        status: 'pago',
        data_pagamento: new Date().toISOString(),
        ...data
      }).eq('id', id).eq('tenant_id', tenantId)).error,
      'useLancamentos.baixarBaixa'
    )
    if (!hasError) await fetchLancamentos()
    return hasError
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
