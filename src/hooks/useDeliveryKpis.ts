import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTenantId } from './useTenantId'

// ============================================
// TYPES
// ============================================

export interface TemposMedios {
  novo: number
  preparo: number
  entrega: number
  total: number
}

export interface DeliveryKpis {
  tempoEntrega: number
  temposMedios: TemposMedios
  pedidosPorHora: number[]
}

export interface DeliveryKpiData {
  id: string
  icon: string
  label: string
  value: string | number
  color: string
}

// ============================================
// HOOK
// ============================================

export function useDeliveryKpis() {
  const { user: _user } = useAuth()
  const tenantId = useTenantId()

  const { data: deliveryKpis = defaultDeliveryKpis, isLoading } = useQuery<DeliveryKpis>({
    queryKey: ['delivery-kpis', tenantId],
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

      // Tempos médios
      const { data: historico } = await supabase
        .from('historico_status')
        .select('pedido_id, status_anterior, status_novo, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)
        .order('created_at', { ascending: true })

      const temposMedios: TemposMedios = { novo: 0, preparo: 0, entrega: 0, total: 0 }

      if (historico && historico.length > 0) {
        const porPedido: Record<
          string,
          Array<{ status_anterior: string; status_novo: string; created_at: string }>
        > = {}

        historico.forEach(
          (h: Record<string, unknown>) => {
            const pedidoId = h.pedido_id as string
            if (!porPedido[pedidoId]) porPedido[pedidoId] = []
            porPedido[pedidoId].push({
              status_anterior: h.status_anterior as string,
              status_novo: h.status_novo as string,
              created_at: h.created_at as string
            })
          }
        )

        let somaNovo = 0,
          somaPreparo = 0,
          somaEntrega = 0
        let countNovo = 0,
          countPreparo = 0,
          countEntrega = 0

        Object.entries(porPedido).forEach(([pedidoId, mudancas]) => {
          let inicioNovo: number | null = null
          let inicioPreparo: number | null = null
          let inicioEntrega: number | null = null

          const pedido = allPedidos.find((p: Record<string, unknown>) => p.id === pedidoId)
          if (pedido) inicioNovo = new Date(pedido.created_at as string).getTime()

          mudancas.forEach(m => {
            const tempo = new Date(m.created_at).getTime()

            if (
              ['pendente', 'aberto', 'confirmado'].includes(m.status_anterior) &&
              m.status_novo === 'preparando'
            ) {
              if (inicioNovo) {
                somaNovo += Math.floor((tempo - inicioNovo) / 60000)
                countNovo++
              }
              inicioPreparo = tempo
            }

            if (
              m.status_anterior === 'preparando' &&
              ['pronto', 'saiu_entrega'].includes(m.status_novo)
            ) {
              if (inicioPreparo) {
                somaPreparo += Math.floor((tempo - inicioPreparo) / 60000)
                countPreparo++
              }
              inicioEntrega = tempo
            }

            if (m.status_novo === 'entregue' && m.status_anterior !== 'cancelado') {
              if (inicioEntrega) {
                somaEntrega += Math.floor((tempo - inicioEntrega) / 60000)
                countEntrega++
              }
            }
          })
        })

        temposMedios.novo = countNovo > 0 ? Math.round(somaNovo / countNovo) : 8
        temposMedios.preparo = countPreparo > 0 ? Math.round(somaPreparo / countPreparo) : 15
        temposMedios.entrega = countEntrega > 0 ? Math.round(somaEntrega / countEntrega) : 12
        temposMedios.total = temposMedios.novo + temposMedios.preparo + temposMedios.entrega
      }

      // Pedidos por hora
      const pedidosPorHora = Array(24).fill(0)
      allPedidos.forEach(p => {
        const hour = new Date(p.created_at).getHours()
        if (hour >= 0 && hour < 24) pedidosPorHora[hour]++
      })

      return {
        tempoEntrega: temposMedios.total,
        temposMedios,
        pedidosPorHora
      }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const kpiData: DeliveryKpiData[] = [
    {
      id: 'tempoEntrega',
      icon: 'timer',
      label: 'Tempo Médio',
      value: `${deliveryKpis.tempoEntrega} min`,
      color: '#ff9800'
    }
  ]

  return {
    deliveryKpis,
    kpiData,
    isLoading
  }
}

const defaultDeliveryKpis: DeliveryKpis = {
  tempoEntrega: 0,
  temposMedios: { novo: 0, preparo: 0, entrega: 0, total: 0 },
  pedidosPorHora: Array(24).fill(0)
}
