import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getTenantIdSafe } from '../lib/getTenantId'
import { useAuth } from '../contexts/AuthContext'

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
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantIdSafe() || '19f48a0b-3117-4d2b-856e-41673dc43275'

  // KPIs de clientes e funnel
  const { data: customerKpis = defaultCustomerKpis, isLoading } = useQuery<CustomerKpis>({
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

      // Eventos jornada (funnel)
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
        avaliacao: avaliacaoMedia,
        totalAvaliacoes: allNpsData.length,
        funnelData: { visualizacoes, addCarrinho, checkoutIniciado, compras }
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
    isLoading
  }
}

const defaultCustomerKpis: CustomerKpis = {
  visualizacoes: 0,
  avaliacao: 0,
  totalAvaliacoes: 0,
  funnelData: { visualizacoes: 0, addCarrinho: 0, checkoutIniciado: 0, compras: 0 }
}
