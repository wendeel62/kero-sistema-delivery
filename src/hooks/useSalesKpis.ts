import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTenantId } from './useTenantId'

// ============================================
// TYPES
// ============================================

export interface SalesKpis {
  faturamento: number
  totalPedidos: number
  ticketMedio: number
  pedidosAbertos: number
  totalEntregues: number
  receita7Dias: number[]
}

export interface SalesKpiData {
  id: string
  icon: string
  label: string
  value: string | number
  color: string
  isCurrency?: boolean
}

// ============================================
// HOOK
// ============================================

export function useSalesKpis() {
  const { user: _user } = useAuth()
  const tenantId = useTenantId()

  const { data: salesKpis = defaultSalesKpis, isLoading, isError } = useQuery<SalesKpis>({
    queryKey: ['sales-kpis', tenantId],
    queryFn: async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      // Busca pedidos de hoje
      const { data: pedidosHoje } = await supabase
        .from('pedidos')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)

      const { data: pedidosOnlineHoje } = await supabase
        .from('pedidos_online')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)

      const allPedidos = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])]
      const validos = allPedidos.filter(p => p.status !== 'cancelado')
      const entregando = allPedidos.filter(p => p.status === 'entregue')
      const abertos = allPedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
      const faturamento = validos.reduce((sum, p) => sum + Number(p.total || 0), 0)

      // Receita dos últimos 7 dias
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(now.getDate() - 7)
      const isoSeteDias = seteDiasAtras.toISOString().split('T')[0]

      const { data: p7 } = await supabase
        .from('pedidos')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoSeteDias)
        .neq('status', 'cancelado')

      const { data: po7 } = await supabase
        .from('pedidos_online')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoSeteDias)
        .neq('status', 'cancelado')

      const all7 = [...(p7 || []), ...(po7 || [])]
      const receitaPorDia = [0, 0, 0, 0, 0, 0, 0]
      all7.forEach(p => {
        const diff = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
        if (diff >= 0 && diff < 7) {
          receitaPorDia[6 - diff] += Number(p.total || 0)
        }
      })

      return {
        faturamento,
        totalPedidos: allPedidos.length,
        ticketMedio: validos.length > 0 ? faturamento / validos.length : 0,
        pedidosAbertos: abertos.length,
        totalEntregues: entregando.length,
        receita7Dias: receitaPorDia
      }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const kpiData: SalesKpiData[] = [
    {
      id: 'faturamento',
      icon: 'payments',
      label: 'Faturamento Hoje',
      value: salesKpis.faturamento,
      color: '#d32f2f',
      isCurrency: true
    },
    {
      id: 'totalPedidos',
      icon: 'shopping_cart',
      label: 'Total Pedidos',
      value: salesKpis.totalPedidos,
      color: '#d32f2f'
    },
    {
      id: 'pedidosAbertos',
      icon: 'schedule',
      label: 'Em Preparo',
      value: salesKpis.pedidosAbertos,
      color: '#ff9800'
    },
    {
      id: 'totalEntregues',
      icon: 'check_circle',
      label: 'Entregues',
      value: salesKpis.totalEntregues,
      color: '#4caf50'
    },
    {
      id: 'ticketMedio',
      icon: 'trending_up',
      label: 'Ticket Médio',
      value: salesKpis.ticketMedio,
      color: '#ff9800',
      isCurrency: true
    }
  ]

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return {
    salesKpis,
    kpiData,
    isLoading,
    isError,
    formatCurrency
  }
}

const defaultSalesKpis: SalesKpis = {
  faturamento: 0,
  totalPedidos: 0,
  ticketMedio: 0,
  pedidosAbertos: 0,
  totalEntregues: 0,
  receita7Dias: [0, 0, 0, 0, 0, 0, 0]
}
