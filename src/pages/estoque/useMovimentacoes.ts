import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { MovimentacaoEstoque } from './types'

export interface UseMovimentacoesReturn {
  movimentacoes: MovimentacaoEstoque[]
  loading: boolean
  fetchMovimentacoes: (periodo?: { inicio: string; fim: string }) => Promise<void>
  registrarEntrada: (data: Partial<MovimentacaoEstoque>) => Promise<void>
  registrarSaida: (data: Partial<MovimentacaoEstoque>) => Promise<void>
  registrarAjuste: (data: Partial<MovimentacaoEstoque>) => Promise<void>
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

      if (error) {
        console.error('Erro ao buscar movimentações:', error)
        return
      }

      setMovimentacoes(data || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchMovimentacoes()
  }, [fetchMovimentacoes])

  const registrarEntrada = async (data: Partial<MovimentacaoEstoque>) => {
    if (!tenantId) return
    
    await supabase.from('entradas_estoque').insert([{
      ...data,
      tenant_id: tenantId,
      data_entrada: new Date().toISOString()
    }])
    
    await fetchMovimentacoes()
  }

  const registrarSaida = async (data: Partial<MovimentacaoEstoque>) => {
    if (!tenantId) return
    
    await supabase.from('saidas_estoque').insert([{
      ...data,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    }])
    
    await fetchMovimentacoes()
  }

  const registrarAjuste = async (data: Partial<MovimentacaoEstoque>) => {
    if (!tenantId) return
    
    await supabase.from('ajustes_estoque').insert([{
      ...data,
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    }])
    
    await fetchMovimentacoes()
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
