import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getTenantIdSafe } from '../lib/getTenantId'
import { useAuth } from '../contexts/AuthContext'

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
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantIdSafe() || '19f48a0b-3117-4d2b-856e-41673dc43275'
  const [receitaDias, setReceitaDias] = useState<number>(7)

  const queryClient = useQueryClient()

  // Faturamento 7 Dias
  const { data: faturamento7Dias = [0, 0, 0, 0, 0, 0, 0], isLoading: loadingFaturamento } = useQuery<number[]>({
    queryKey: ['faturamento-7dias', tenantId],
    queryFn: async () => {
      const now = new Date()
      const resultado: number[] = [0, 0, 0, 0, 0, 0, 0]

      for (let i = 6; i >= 0; i--) {
        const data = new Date(now)
        data.setDate(now.getDate() - i)
        const dataStr = data.toISOString().split('T')[0]
        const dataStrProx = new Date(data)
        dataStrProx.setDate(data.getDate() + 1)

        const { data: pedidosDia } = await supabase
          .from('pedidos')
          .select('total')
          .eq('tenant_id', tenantId)
          .gte('created_at', dataStr)
          .lt('created_at', dataStrProx.toISOString().split('T')[0])
          .neq('status', 'cancelado')

        const { data: pedidosOnlineDia } = await supabase
          .from('pedidos_online')
          .select('total')
          .eq('tenant_id', tenantId)
          .gte('created_at', dataStr)
          .lt('created_at', dataStrProx.toISOString().split('T')[0])
          .neq('status', 'cancelado')

        resultado[6 - i] = [...(pedidosDia || []), ...(pedidosOnlineDia || [])].reduce(
          (sum, p) => sum + Number(p.total || 0),
          0
        )
      }

      return resultado
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // Receita por período
  const { data: receitaData, isLoading: loadingReceita } = useQuery<ReceitaData>({
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
  const { data: configData, isLoading: loadingConfig } = useQuery({
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
