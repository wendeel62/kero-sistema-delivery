import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTenantId } from './useTenantId'

// ============================================
// TYPES
// ============================================

export interface ReceitaData {
  receitaPorDia: number[]
  totalReceita: number
}

export interface FinancialKpis {
  receita7Dias: number[]
  receitaData: ReceitaData | null
}

export interface FinancialConfig {
  lojaAberta: boolean
  linkCardapio: string
}

// ============================================
// HOOK
// ============================================

export function useFinancialKpis() {
  const { user: _user } = useAuth()
  const tenantId = useTenantId()
  const [receitaDias, setReceitaDias] = useState<number>(7)

  const queryClient = useQueryClient()

  // Faturamento 7 Dias (query única em vez de loop)
  const { data: faturamento7Dias = [0, 0, 0, 0, 0, 0, 0], isLoading: loadingFaturamento, isError: errorFaturamento } = useQuery<number[]>({
    queryKey: ['faturamento-7dias', tenantId],
    queryFn: async () => {
      const now = new Date()
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(now.getDate() - 7)
      const isoSeteDias = seteDiasAtras.toISOString().split('T')[0]

      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoSeteDias)
        .neq('status', 'cancelado')

      const { data: pedidosOnline } = await supabase
        .from('pedidos_online')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoSeteDias)
        .neq('status', 'cancelado')

      const all = [...(pedidos || []), ...(pedidosOnline || [])]
      const resultado = [0, 0, 0, 0, 0, 0, 0]
      all.forEach(p => {
        const diff = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
        if (diff >= 0 && diff < 7) {
          resultado[6 - diff] += Number(p.total || 0)
        }
      })
      return resultado
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // Receita por período
  const { data: receitaData, isLoading: loadingReceita, isError: errorReceita } = useQuery<ReceitaData>({
    queryKey: ['receita-por-periodo', tenantId, receitaDias],
    queryFn: async () => {
      const now = new Date()
      const diasAtras = new Date()
      diasAtras.setDate(now.getDate() - receitaDias)
      const isoDiasAtras = diasAtras.toISOString().split('T')[0]

      const { data: pedidosPeriodo } = await supabase
        .from('pedidos')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoDiasAtras)
        .neq('status', 'cancelado')

      const { data: pedidosOnlinePeriodo } = await supabase
        .from('pedidos_online')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoDiasAtras)
        .neq('status', 'cancelado')

      const allPedidosPeriodo = [...(pedidosPeriodo || []), ...(pedidosOnlinePeriodo || [])]
      const receitaPorDia: number[] = []

      for (let i = receitaDias - 1; i >= 0; i--) {
        const data = new Date(now)
        data.setDate(now.getDate() - i)
        const dataStr = data.toISOString().split('T')[0]
        receitaPorDia.push(
          allPedidosPeriodo
            .filter(p => p.created_at && p.created_at.startsWith(dataStr))
            .reduce((sum, p) => sum + Number(p.total || 0), 0)
        )
      }

      return {
        receitaPorDia,
        totalReceita: allPedidosPeriodo.reduce((sum, p) => sum + Number(p.total || 0), 0)
      }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // Configurações da loja
  const { data: configData, isLoading: loadingConfig, isError: errorConfig } = useQuery({
    queryKey: ['configuracoes-loja', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('id, loja_aberta, slug, nome_loja')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return data
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // Toggle Loja
  const { mutate: toggleLoja, isPending: loadingLoja } = useMutation({
    mutationFn: async () => {
      const novoEstado = configData?.loja_aberta ? false : true
      if (configData?.id) {
        await supabase.from('configuracoes').update({ loja_aberta: novoEstado }).eq('id', configData.id)
      } else {
        await supabase.from('configuracoes').insert({ tenant_id: tenantId, loja_aberta: novoEstado })
      }
      return novoEstado
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-loja', tenantId] })
    }
  })

  // Link Cardápio
  const linkCardapio = configData?.slug
    ? '/cardapio/' + configData.slug
    : configData?.nome_loja
    ? '/cardapio/' + slugify(configData.nome_loja)
    : ''

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const isLoading = loadingFaturamento || loadingReceita || loadingConfig
  const isError = errorFaturamento || errorReceita || errorConfig

  return {
    financialKpis: {
      receita7Dias: faturamento7Dias,
      receitaData: receitaData || null
    },
    receitaDias,
    setReceitaDias,
    toggleLoja,
    linkCardapio,
    lojaAberta: configData?.loja_aberta ?? true,
    loadingLoja,
    isLoading,
    isError,
    formatCurrency
  }
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
