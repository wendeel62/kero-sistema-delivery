import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTenantId } from './useTenantId'

// ============================================
// TYPES
// ============================================

export interface CustomerKpis {
  visualizacoes: number
  avaliacao: number
  totalAvaliacoes: number
  funnelData: FunnelData
}

export interface FunnelData {
  visualizacoes: number
  addCarrinho: number
  checkoutIniciado: number
  compras: number
}

export interface FunnelKpiData {
  id: string
  icon: string
  label: string
  value: string | number
  color: string
}

// ============================================
// HOOK
// ============================================

export function useCustomerKpis() {
  const { user: _user } = useAuth()
  const tenantId = useTenantId()

  // KPIs de clientes e funnel
  const { data: customerKpis = defaultCustomerKpis, isLoading, isError } = useQuery<CustomerKpis>({
    queryKey: ['customer-kpis', tenantId],
    queryFn: async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      // NPS - Avaliações
      const { data: npsDataPedidos } = await supabase
        .from('pedidos')
        .select('nps_nota')
        .eq('tenant_id', tenantId)
        .eq('nps_respondido', true)
        .gte('created_at', today)
        .not('nps_nota', 'is', null)

      const { data: npsDataOnline } = await supabase
        .from('pedidos_online')
        .select('nps_nota')
        .eq('tenant_id', tenantId)
        .eq('nps_respondido', true)
        .gte('created_at', today)
        .not('nps_nota', 'is', null)

      const allNpsData = [...(npsDataPedidos || []), ...(npsDataOnline || [])]
      const avaliacaoMedia =
        allNpsData.length > 0
          ? Math.round((allNpsData.reduce((sum, p) => sum + (p.nps_nota || 0), 0) / allNpsData.length) * 10) / 10
          : 0

      return {
        visualizacoes: 0,
        avaliacao: avaliacaoMedia,
        totalAvaliacoes: allNpsData.length,
        funnelData: { visualizacoes: 0, addCarrinho: 0, checkoutIniciado: 0, compras: 0 }
      }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const kpiData: FunnelKpiData[] = [
    {
      id: 'visualizacoes',
      icon: 'visibility',
      label: 'VISITA AO CARDÁPIO AGORA',
      value: customerKpis.visualizacoes,
      color: '#d32f2f'
    },
    {
      id: 'avaliacao',
      icon: 'star',
      label: 'NPS',
      value: `${customerKpis.avaliacao.toFixed(1)}`,
      color: '#ffb74d'
    }
  ]

  return {
    customerKpis,
    kpiData,
    isLoading,
    isError
  }
}

const defaultCustomerKpis: CustomerKpis = {
  visualizacoes: 0,
  avaliacao: 0,
  totalAvaliacoes: 0,
  funnelData: { visualizacoes: 0, addCarrinho: 0, checkoutIniciado: 0, compras: 0 }
}
