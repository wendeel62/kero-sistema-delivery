import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { handleSupabaseError } from '../../lib/supabaseErrorHandler'
import { logger } from '../../utils/logger'
import type { MovimentacaoEstoque } from './types'

export interface UseMovimentacoesReturn {
  movimentacoes: MovimentacaoEstoque[]
  loading: boolean
  fetchMovimentacoes: (periodo?: { inicio: string; fim: string }) => Promise<void>
  registrarEntrada: (data: Partial<MovimentacaoEstoque>) => Promise<boolean>
  registrarSaida: (data: Partial<MovimentacaoEstoque>) => Promise<boolean>
  registrarAjuste: (data: Partial<MovimentacaoEstoque>) => Promise<boolean>
}

export function useMovimentacoes(tenantId: string | undefined): UseMovimentacoesReturn {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMovimentacoes = useCallback(async (periodo?: { inicio: string; fim: string }) => {
    if (!tenantId) return

    setLoading(true)
    try {
      let query = supabase
        .from('movimentacoes_estoque')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (periodo?.inicio && periodo?.fim) {
        query = query.gte('created_at', periodo.inicio).lte('created_at', periodo.fim)
      }

      const { data, error } = await query

      if (handleSupabaseError(error, 'useMovimentacoes.fetchMovimentacoes')) return

      setMovimentacoes(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('[useMovimentacoes] Unexpected error', { message })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchMovimentacoes()
  }, [fetchMovimentacoes])

  const registrarEntrada = async (data: Partial<MovimentacaoEstoque>): Promise<boolean> => {
    if (!tenantId) return true
    const hasError = handleSupabaseError(
      (await supabase.from('entradas_estoque').insert([{
        ...data,
        tenant_id: tenantId,
        data_entrada: new Date().toISOString()
      }])).error,
      'useMovimentacoes.registrarEntrada'
    )
    if (!hasError) await fetchMovimentacoes()
    return hasError
  }

  const registrarSaida = async (data: Partial<MovimentacaoEstoque>): Promise<boolean> => {
    if (!tenantId) return true
    const hasError = handleSupabaseError(
      (await supabase.from('saidas_estoque').insert([{
        ...data,
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      }])).error,
      'useMovimentacoes.registrarSaida'
    )
    if (!hasError) await fetchMovimentacoes()
    return hasError
  }

  const registrarAjuste = async (data: Partial<MovimentacaoEstoque>): Promise<boolean> => {
    if (!tenantId) return true
    const hasError = handleSupabaseError(
      (await supabase.from('ajustes_estoque').insert([{
        ...data,
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      }])).error,
      'useMovimentacoes.registrarAjuste'
    )
    if (!hasError) await fetchMovimentacoes()
    return hasError
  }

  return {
    movimentacoes,
    loading,
    fetchMovimentacoes,
    registrarEntrada,
    registrarSaida,
    registrarAjuste
  }
}
