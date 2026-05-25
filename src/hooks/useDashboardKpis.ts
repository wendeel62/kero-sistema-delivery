import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { useTenantId } from '../hooks/useTenantId'

// Import hooks especializados
import { useSalesKpis } from './useSalesKpis'
import { useCustomerKpis, type FunnelData } from './useCustomerKpis'
import { useProductKpis } from './useProductKpis'
import { useDeliveryKpis, type TemposMedios } from './useDeliveryKpis'
import { useFinancialKpis } from './useFinancialKpis'

// Re-export types para compatibilidade
export type {
  SalesKpis,
  SalesKpiData
} from './useSalesKpis'
export type { CustomerKpis, FunnelData } from './useCustomerKpis'
export type { ProductKpis, ProdutoVendido } from './useProductKpis'
export type { DeliveryKpis, TemposMedios } from './useDeliveryKpis'
export type { FinancialKpis, ReceitaData } from './useFinancialKpis'

// ============================================
// TYPES GERAIS (para compatibilidade)
// ============================================

export interface KPIs {
  faturamento: number
  totalPedidos: number
  ticketMedio: number
  tempoEntrega: number
  visualizacoes: number
  avaliacao: number
  totalAvaliacoes: number
  pedidosAbertos: number
  totalEntregues: number
  receita7Dias: number[]
  temposMedios: TemposMedios
  funnelData: FunnelData
  pedidosPorHora: number[]
}

export interface KpiData {
  id: string
  icon: string
  label: string
  value: string | number
  color: string
  isCurrency?: boolean
}

export interface Pedido {
  id: string
  cliente: string
  total: number
  status: string
  created_at: string
}

export interface FunnelRealtimeData {
  visualizacoes: number
  addCarrinho: number
  checkoutIniciado: number
  compras: number
}

// Alias para compatibilidade com código legado
export type FunilRealtimeData = FunnelRealtimeData

// unused defaultKpis removed to fix lint error
// const defaultKpis: KPIs = { ... }

export function useDashboardKpis() {
  const { user: _user } = useAuth()
  const tenantId = useTenantId()

  const [funilSelecionado, setFunilSelecionado] = useState<string>('todas')
  const [showFunilDropdown, setShowFunilDropdown] = useState(false)
  const [_receitaDias, _setReceitaDias] = useState<number>(7)
  const [showReceitaDropdown, setShowReceitaDropdown] = useState(false)

  // Hooks especializados
  const {
    salesKpis,
    kpiData: salesKpiData,
    isLoading: loadingSales,
    formatCurrency
  } = useSalesKpis()

  const {
    customerKpis,
    kpiData: customerKpiData,
    isLoading: loadingCustomer
  } = useCustomerKpis()

  const { productKpis, isLoading: loadingProducts } = useProductKpis()

  const {
    deliveryKpis,
    kpiData: deliveryKpiData,
    isLoading: loadingDelivery
  } = useDeliveryKpis()

  const {
    financialKpis,
    receitaDias: financialReceitaDias,
    setReceitaDias: setFinancialReceitaDias,
    toggleLoja,
    linkCardapio,
    lojaAberta,
    loadingLoja,
    isLoading: loadingFinancial,
    formatCurrency: formatCurrencyFinancial
  } = useFinancialKpis()

  // Combina KPIs para compatibilidade com código legado
  const kpis: KPIs = {
    faturamento: salesKpis.faturamento,
    totalPedidos: salesKpis.totalPedidos,
    ticketMedio: salesKpis.ticketMedio,
    tempoEntrega: deliveryKpis.tempoEntrega,
    visualizacoes: customerKpis.visualizacoes,
    avaliacao: customerKpis.avaliacao,
    totalAvaliacoes: customerKpis.totalAvaliacoes,
    pedidosAbertos: salesKpis.pedidosAbertos,
    totalEntregues: salesKpis.totalEntregues,
    receita7Dias: financialKpis.receita7Dias,
    temposMedios: deliveryKpis.temposMedios,
    funnelData: customerKpis.funnelData,
    pedidosPorHora: deliveryKpis.pedidosPorHora
  }

  // Combina todos os KPI cards
  const kpiData: KpiData[] = [...salesKpiData, ...customerKpiData, ...deliveryKpiData]

  // Query para pedidos recentes (mantém separado para revalidação específica)
  const { data: pedidosRecentes = [] as Pedido[], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos-recentes', tenantId],
    queryFn: async () => {
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, cliente, total, status, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: pedidosOnline } = await supabase
        .from('pedidos_online')
        .select('id, cliente, total, status, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10)

      return [...(pedidos || []), ...(pedidosOnline || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 10) as Pedido[]
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // Funil em tempo real
  const { data: funilData } = useQuery<FunnelRealtimeData>({
    queryKey: ['funil-tempo-real', tenantId],
    queryFn: async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      let visualizacoes = 0
      let addCarrinho = 0
      let checkoutIniciado = 0
      let compras = 0

      try {
        const { data: eventosData } = await supabase
          .from('eventos_jornada')
          .select('tipo_evento, quantidade')
          .eq('tenant_id', tenantId)
          .gte('data', today)

        const eventos = eventosData || []
        visualizacoes = eventos
          .filter(e => e.tipo_evento === 'visualizacao')
          .reduce((sum, e) => sum + e.quantidade, 0)
        addCarrinho = eventos
          .filter(e => e.tipo_evento === 'add_carrinho')
          .reduce((sum, e) => sum + e.quantidade, 0)
        checkoutIniciado = eventos
          .filter(e => e.tipo_evento === 'checkout_iniciado')
          .reduce((sum, e) => sum + e.quantidade, 0)
        compras = eventos
          .filter(e => e.tipo_evento === 'compra')
          .reduce((sum, e) => sum + e.quantidade, 0)
      } catch {
        // tabela pode não existir
      }

      return {
        visualizacoes,
        addCarrinho,
        checkoutIniciado,
        compras,
      }
    },
    staleTime: 10000,
    enabled: !!tenantId,
    refetchInterval: 10000
  })

  // Dados de receita para o gráfico
  const receitaData = financialKpis.receitaData

  // Realtime
  const queryClient = useQueryClient()

  useRealtime({
    configs: [
      {
        table: 'pedidos',
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
        callback: () => {
          queryClient.invalidateQueries({ queryKey: ['sales-kpis'] })
          queryClient.invalidateQueries({ queryKey: ['financial-kpis'] })
        }
      },
      {
        table: 'pedidos_online',
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
        callback: () => {
          queryClient.invalidateQueries({ queryKey: ['sales-kpis'] })
          queryClient.invalidateQueries({ queryKey: ['financial-kpis'] })
        }
      },
      {
        table: 'configuracoes',
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
        callback: () => {
          queryClient.invalidateQueries({ queryKey: ['configuracoes-loja', tenantId] })
        }
      }
    ]
  })

  const isLoading =
    loadingSales || loadingCustomer || loadingProducts || loadingDelivery || loadingFinancial || loadingPedidos

  return {
    // Hooks especializados (para uso direto)
    salesKpis,
    customerKpis,
    productKpis,
    deliveryKpis,
    financialKpis,

    // Dados combinados (para compatibilidade)
    tenantId,
    kpis,
    kpiData,
    pedidosRecentes,
    topProdutos: productKpis.topProdutos,
    funilData,
    receitaData,
    receitaDias: financialReceitaDias,
    setReceitaDias: setFinancialReceitaDias,
    funilSelecionado,
    setFunilSelecionado,
    showFunilDropdown,
    setShowFunilDropdown,
    showReceitaDropdown,
    setShowReceitaDropdown,
    lojaAberta,
    loadingLoja,
    toggleLoja,
    linkCardapio,
    isLoading,
    formatCurrency: formatCurrency || formatCurrencyFinancial
  }
}
