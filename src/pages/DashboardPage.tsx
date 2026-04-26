import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { BarChart, Bar, AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface TemposMedios {
  novo: number
  preparo: number
  entrega: number
  total: number
}

interface KPIs {
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

interface FunnelData {
  visualizacoes: number
  addCarrinho: number
  checkoutIniciado: number
  compras: number
}

interface KpiData {
  id: string
  icon: string
  label: string
  value: string | number
  color: string
  isCurrency?: boolean
}

interface Pedido {
  id: string
  cliente: string
  total: number
  status: string
  created_at: string
}

interface Produto {
  id: string
  nome: string
  totalVendido: number
  quantidade: number
}

const defaultKpis: KPIs = {
  faturamento: 0,
  totalPedidos: 0,
  ticketMedio: 0,
  tempoEntrega: 0,
  visualizacoes: 0,
  avaliacao: 0,
  totalAvaliacoes: 0,
  pedidosAbertos: 0,
  totalEntregues: 0,
  receita7Dias: [0, 0, 0, 0, 0, 0, 0],
  temposMedios: { novo: 0, preparo: 0, entrega: 0, total: 0 },
  funnelData: { visualizacoes: 0, addCarrinho: 0, checkoutIniciado: 0, compras: 0 },
  pedidosPorHora: Array(24).fill(0)
}

function getTenantId(): string {
  const configStr = localStorage.getItem('supabase.auth.token')
  if (configStr) {
    try {
      const config = JSON.parse(configStr)
      return config.access_token?.user_metadata?.tenant_id || config.user?.user_metadata?.tenant_id || ''
    } catch {
      return ''
    }
  }
  return ''
}

export default function DashboardPage() {
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantId() || '19f48a0b-3117-4d2b-856e-41673dc43275'

  const [linkCardapio, setLinkCardapio] = useState('')
  const [funilSelecionado, setFunilSelecionado] = useState<string>('todas')
  const [showFunilDropdown, setShowFunilDropdown] = useState(false)
  const [receitaDias, setReceitaDias] = useState<number>(7)
  const [showReceitaDropdown, setShowReceitaDropdown] = useState(false)

  const { data: kpis = defaultKpis, isLoading: loadingKpis, refetch: refetchKpis } = useQuery({
    queryKey: ['dashboard-kpis', tenantId],
    queryFn: async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      const { data: pedidosHoje } = await supabase.from('pedidos').select('*').eq('tenant_id', tenantId).gte('created_at', today)
      const { data: pedidosOnlineHoje } = await supabase.from('pedidos_online').select('*').eq('tenant_id', tenantId).gte('created_at', today)

      const allPedidos = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])]
      const validos = allPedidos.filter(p => p.status !== 'cancelado')
      const entregando = allPedidos.filter(p => p.status === 'entregue')
      const abertos = allPedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
      
      const faturamento = validos.reduce((sum, p) => sum + Number(p.total || 0), 0)

      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(now.getDate() - 7)
      const isoSeteDias = seteDiasAtras.toISOString().split('T')[0]

      const { data: p7 } = await supabase.from('pedidos').select('total, created_at').eq('tenant_id', tenantId).gte('created_at', isoSeteDias).neq('status', 'cancelado')
      const { data: po7 } = await supabase.from('pedidos_online').select('total, created_at').eq('tenant_id', tenantId).gte('created_at', isoSeteDias).neq('status', 'cancelado')

      const all7 = [...(p7 || []), ...(po7 || [])]
      const receitaPorDia = [0, 0, 0, 0, 0, 0, 0]
      
      all7.forEach(p => {
         const diff = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
         if (diff >= 0 && diff < 7) {
            receitaPorDia[6 - diff] += Number(p.total || 0)
         }
      })

      const { data: historico } = await supabase
        .from('historico_status')
        .select('pedido_id, status_anterior, status_novo, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)
        .order('created_at', { ascending: true })

      const temposMedios: TemposMedios = { novo: 0, preparo: 0, entrega: 0, total: 0 }
      
      if (historico && historico.length > 0) {
        const porPedido: Record<string, Array<{status_anterior: string, status_novo: string, created_at: string}>> = {}
        historico.forEach((h: any) => {
          if (!porPedido[h.pedido_id]) porPedido[h.pedido_id] = []
          porPedido[h.pedido_id].push({
            status_anterior: h.status_anterior,
            status_novo: h.status_novo,
            created_at: h.created_at
          })
        })

        let somaNovo = 0, somaPreparo = 0, somaEntrega = 0
        let countNovo = 0, countPreparo = 0, countEntrega = 0

        Object.entries(porPedido).forEach(([pedidoId, mudancas]) => {
          let inicioNovo: number | null = null
          let inicioPreparo: number | null = null
          let inicioEntrega: number | null = null

          const pedido = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])].find((p: any) => p.id === pedidoId)
          if (pedido) {
            inicioNovo = new Date(pedido.created_at).getTime()
          }

          mudancas.forEach(m => {
            const tempo = new Date(m.created_at).getTime()
            
            if (['pendente', 'aberto', 'confirmado'].includes(m.status_anterior) && m.status_novo === 'preparando') {
              if (inicioNovo) {
                somaNovo += Math.floor((tempo - inicioNovo) / 60000)
                countNovo++
              }
              inicioPreparo = tempo
            }
            
            if (m.status_anterior === 'preparando' && ['pronto', 'saiu_entrega'].includes(m.status_novo)) {
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

      const avaliacaoMedia = allNpsData.length > 0
        ? Math.round((allNpsData.reduce((sum, p) => sum + (p.nps_nota || 0), 0) / allNpsData.length) * 10) / 10
        : 0

      const { data: eventosData } = await supabase
        .from('eventos_jornada')
        .select('tipo_evento, quantidade')
        .eq('tenant_id', tenantId)
        .gte('data', today)

      const eventos = eventosData || []
      const visualizacoes = eventos.filter(e => e.tipo_evento === 'visualizacao').reduce((sum, e) => sum + e.quantidade, 0)
      const addCarrinho = eventos.filter(e => e.tipo_evento === 'add_carrinho').reduce((sum, e) => sum + e.quantidade, 0)
      const checkoutIniciado = eventos.filter(e => e.tipo_evento === 'checkout_iniciado').reduce((sum, e) => sum + e.quantidade, 0)
      const compras = eventos.filter(e => e.tipo_evento === 'compra').reduce((sum, e) => sum + e.quantidade, 0)

      const pedidosPorHora = Array(24).fill(0)
      
      allPedidos.forEach(p => {
        const hour = new Date(p.created_at).getHours()
        if (hour >= 0 && hour < 24) {
          pedidosPorHora[hour]++
        }
      })

      const { data: pedidosOnlineHojeAll } = await supabase
        .from('pedidos_online')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)
      
      if (pedidosOnlineHojeAll) {
        pedidosOnlineHojeAll.forEach(p => {
          const hour = new Date(p.created_at).getHours()
          if (hour >= 0 && hour < 24) {
            pedidosPorHora[hour]++
          }
        })
      }

      return {
        faturamento,
        totalPedidos: allPedidos.length,
        ticketMedio: validos.length > 0 ? faturamento / validos.length : 0,
        tempoEntrega: temposMedios.total,
        visualizacoes,
        avaliacao: avaliacaoMedia,
        totalAvaliacoes: allNpsData.length,
        pedidosAbertos: abertos.length,
        totalEntregues: entregando.length,
        receita7Dias: receitaPorDia,
        temposMedios,
        funnelData: { visualizacoes, addCarrinho, checkoutIniciado, compras },
        pedidosPorHora
      }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

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

      const combined = [...(pedidos || []), ...(pedidosOnline || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      return combined as Pedido[]
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const { data: topProdutos = [] as Produto[], isLoading: loadingProdutos } = useQuery({
    queryKey: ['top-produtos', tenantId],
    queryFn: async () => {
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: itensPedido } = await supabase
        .from('itens_pedido')
        .select('produto_id, quantidade, preco')
        .eq('tenant_id', tenantId)
        .gte('created_at', seteDiasAtras)

      const produtoIds = [...new Set(itensPedido?.map(item => item.produto_id).filter(Boolean) || [])]
      
      let produtoMap: Record<string, { nome: string; totalVendido: number; quantidade: number }> = {}
      
      if (produtoIds.length > 0) {
        const { data: produtos } = await supabase
          .from('produtos')
          .select('id, nome')
          .eq('tenant_id', tenantId)
          .in('id', produtoIds)
        
        const produtosPorId = (produtos || []).reduce((acc, p) => {
          acc[p.id] = p.nome
          return acc
        }, {} as Record<string, string>)
        
        produtoMap = produtoIds.reduce((acc, id) => {
          acc[id] = { nome: produtosPorId[id] || 'Produto', totalVendido: 0, quantidade: 0 }
          return acc
        }, {} as Record<string, { nome: string; totalVendido: number; quantidade: number }>)
        
        if (itensPedido) {
          for (const item of itensPedido) {
            if (produtoMap[item.produto_id]) {
              produtoMap[item.produto_id].totalVendido += Number(item.preco) * item.quantidade
              produtoMap[item.produto_id].quantidade += item.quantidade
            }
          }
        }
      }

      return Object.entries(produtoMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.totalVendido - a.totalVendido)
        .slice(0, 5) as Produto[]
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const { data: faturamento7Dias = [0, 0, 0, 0, 0, 0, 0] as number[], isLoading: loadingFaturamento } = useQuery({
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

        const totalDia = [...(pedidosDia || []), ...(pedidosOnlineDia || [])]
          .reduce((sum, p) => sum + Number(p.total || 0), 0)
        
        resultado[6 - i] = totalDia
      }

      return resultado
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const { data: configData, isLoading: loadingConfig } = useQuery({
    queryKey: ['configuracoes-loja', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('id, loja_aberta')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const { data: funilData } = useQuery({
    queryKey: ['funil-tempo-real', tenantId],
    queryFn: async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      const { data: eventosData } = await supabase
        .from('eventos_jornada')
        .select('tipo_evento, quantidade')
        .eq('tenant_id', tenantId)
        .gte('data', today)

      const eventos = eventosData || []
      
      const { data: whatsAppData } = await supabase
        .from('mensagens_whatsapp')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)

      return {
        visualizacoes: eventos.filter(e => e.tipo_evento === 'visualizacao').reduce((sum, e) => sum + e.quantidade, 0),
        addCarrinho: eventos.filter(e => e.tipo_evento === 'add_carrinho').reduce((sum, e) => sum + e.quantidade, 0),
        checkoutIniciado: eventos.filter(e => e.tipo_evento === 'checkout_iniciado').reduce((sum, e) => sum + e.quantidade, 0),
        compras: eventos.filter(e => e.tipo_evento === 'compra').reduce((sum, e) => sum + e.quantidade, 0),
        whatsapp: whatsAppData?.length || 0
      }
    },
    staleTime: 10000,
    enabled: !!tenantId,
    refetchInterval: 10000
  })

  const { data: receitaData } = useQuery({
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
        
        const totalDia = allPedidosPeriodo
          .filter(p => p.created_at && p.created_at.startsWith(dataStr))
          .reduce((sum, p) => sum + Number(p.total || 0), 0)
        
        receitaPorDia.push(totalDia)
      }

      const totalReceita = allPedidosPeriodo.reduce((sum, p) => sum + Number(p.total || 0), 0)

      return {
        receitaPorDia,
        totalReceita
      }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  const queryClient = useQueryClient()

  const { mutate: toggleLoja, isPending: loadingLoja } = useMutation({
    mutationFn: async () => {
      const novoEstado = !configData?.loja_aberta
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

  useEffect(() => {
    setLinkCardapio(window.location.origin + '/cardapio')
  }, [])

  const lojaAberta = configData?.loja_aberta ?? true

  // Fallback fixo para tenantId
  const safeTenantId = tenantId || '19f48a0b-3117-4d2b-856e-41673dc43275'

  useRealtime({
    configs: [
      { table: 'pedidos', filter: `tenant_id=eq.${safeTenantId}`, callback: () => { 
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }) 
        queryClient.invalidateQueries({ queryKey: ['receita-por-periodo'] }) 
      }},
      { table: 'pedidos_online', filter: `tenant_id=eq.${safeTenantId}`, callback: () => { 
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }) 
        queryClient.invalidateQueries({ queryKey: ['receita-por-periodo'] }) 
      }},
      { table: 'eventos_jornada', filter: `tenant_id=eq.${safeTenantId}`, callback: () => { queryClient.invalidateQueries({ queryKey: ['funil-tempo-real', safeTenantId] }) } },
    ]
  })

  if (loadingKpis || loadingPedidos || loadingProdutos || loadingFaturamento || loadingConfig) {
    return (
      <div className="min-h-screen py-8 px-4 lg:px-8 space-y-8 animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="h-16 w-48 bg-surface-variant rounded-lg animate-pulse"></div>
          <div className="flex gap-3">
            <div className="h-12 w-32 bg-surface-variant rounded-lg animate-pulse"></div>
            <div className="h-12 w-40 bg-surface-variant rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border border-outline bg-surface-container animate-pulse h-36"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container animate-pulse h-64"></div>
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container animate-pulse h-64"></div>
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container col-span-1 lg:col-span-2 animate-pulse h-48"></div>
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container animate-pulse h-64"></div>
        </div>
      </div>
    )
  }

  const kpiData = [
    { id: 'faturamento', icon: 'payments', label: 'Faturamento Hoje', value: kpis.faturamento, color: '#d32f2f', isCurrency: true },
    { id: 'totalPedidos', icon: 'shopping_cart', label: 'Total Pedidos', value: kpis.totalPedidos, color: '#d32f2f' },
    { id: 'pedidosAbertos', icon: 'schedule', label: 'Em Preparo', value: kpis.pedidosAbertos, color: '#ff9800' },
    { id: 'totalEntregues', icon: 'check_circle', label: 'Entregues', value: kpis.totalEntregues, color: '#4caf50' },
    { id: 'ticketMedio', icon: 'trending_up', label: 'Ticket Médio', value: kpis.ticketMedio, color: '#ff9800', isCurrency: true },
    { id: 'tempoEntrega', icon: 'timer', label: 'Tempo Médio', value: `${kpis.tempoEntrega} min`, color: '#ff9800' },
    { id: 'avaliacao', icon: 'star', label: 'NPS', value: `${kpis.avaliacao.toFixed(1)}`, color: '#ffb74d' },
    { id: 'visualizacoes', icon: 'visibility', label: 'VISITA AO CARDÁPIO AGORA', value: kpis.visualizacoes, color: '#d32f2f' },
  ]

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const dias = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
  const maxReceita = Math.max(...kpis.receita7Dias, 1)

  const maxPicos = Math.max(...kpis.pedidosPorHora, 1)
  const horaPico = kpis.pedidosPorHora.indexOf(maxPicos)

  return (
    <div className="min-h-screen py-8 px-4 lg:px-8 space-y-8 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-slide-in-down">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold font-headline text-on-background tracking-tight">Dashboard</h1>
          <p className="text-on-surface-variant mt-1 text-lg">Visão geral do dia</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => toggleLoja()}
            disabled={loadingLoja}
            className={`px-6 py-3 rounded-lg font-bold border-2 transition-all flex items-center gap-2 text-sm ${
              lojaAberta
                ? 'border-secondary/50 bg-secondary/5 hover:border-secondary-bright text-secondary-bright hover:bg-secondary/10 shadow-lg shadow-secondary/20'
                : 'border-primary/50 bg-primary/5 hover:border-primary-bright text-primary hover:bg-primary/10 shadow-lg shadow-primary/20'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${lojaAberta ? 'bg-secondary shadow-lg' : 'bg-primary'}`} />
            {lojaAberta ? 'Loja Aberta' : 'Loja Fechada'}
          </button>
          <a 
            href={linkCardapio} 
            target="_blank" 
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary-bright hover:from-primary-bright hover:to-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-primary/50 hover:shadow-xl transition-all border border-transparent flex items-center gap-2 text-sm animate-slide-in-right"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined !text-lg">qr_code_scanner</span>
            Abrir Cardápio
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-stagger">
        {kpiData.map((kpi, i) => (
          <div 
            key={kpi.id} 
            className="group p-6 rounded-2xl border border-outline bg-surface-container hover:border-primary/50 hover:bg-surface-container-high shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-smooth animate-fade-in-up"
            style={{ '--i': i } as any}
          >
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${kpi.color === '#d32f2f' ? 'bg-primary/10' : kpi.color === '#ff9800' ? 'bg-secondary/10' : 'bg-surface-variant'}`}>
                  <span className="material-symbols-outlined text-lg md:text-xl group-hover:animate-glow" style={{ color: kpi.color }}>
                    {kpi.icon}
                  </span>
                </div>
              </div>
              <p className="text-on-surface-variant text-xs md:text-sm uppercase tracking-wide font-medium line-clamp-2 flex-1">{kpi.label}</p>
              <div className={`text-xl md:text-2xl font-black truncate`} style={{ color: kpi.color }}>
                {kpi.isCurrency ? formatCurrency(kpi.value as number) : kpi.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-primary/50 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-smooth animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-on-background">Receita {receitaDias} Dias</h3>
              <p className="text-on-surface-variant text-sm mt-1">Vendas diárias</p>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowReceitaDropdown(!showReceitaDropdown)}
                className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center hover:bg-primary/20 transition-smooth cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
              </button>
              {showReceitaDropdown && (
                <div className="absolute top-14 right-0 w-36 bg-surface-container border border-outline rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                  {[
                    { dias: 7, label: '7 Dias' },
                    { dias: 15, label: '15 Dias' },
                    { dias: 30, label: '30 Dias' }
                  ].map((opcao) => (
                    <button
                      key={opcao.dias}
                      onClick={() => {
                        setReceitaDias(opcao.dias)
                        setShowReceitaDropdown(false)
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-surface-container-high transition-smooth ${
                        receitaDias === opcao.dias ? 'bg-primary/10 text-primary' : 'text-on-surface'
                      }`}
                    >
                      <span className="text-sm">{opcao.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between gap-1 h-32">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={receitaData?.receitaPorDia?.map((valor, i) => ({ dia: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][6 - i], valor })).reverse() || []}>
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  contentStyle={{ backgroundColor: '#16181f', border: '1px solid #252830', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Bar dataKey="valor" fill="#e8391a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-on-surface-variant">-{receitaDias}d</span>
            <span className="text-xs text-on-surface-variant">Hoje</span>
          </div>
          <div className="mt-4 pt-4 border-t border-outline flex justify-between items-center">
            <span className="text-sm text-on-surface-variant">Total {receitaDias} dias</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(receitaData?.totalReceita || 0)}</span>
          </div>
        </div>

        <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-secondary/50 shadow-lg hover:shadow-xl hover:shadow-secondary/20 transition-smooth animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-on-background">Picos Hora</h3>
              <p className="text-on-surface-variant text-sm mt-1">Hoje</p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-xl">insights</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={kpis.pedidosPorHora.map((count, hour) => ({ hora: `${hour}h`, pedidos: count }))}>
              <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(value: number) => [`${value} pedidos`, 'Qtd']}
                contentStyle={{ backgroundColor: '#16181f', border: '1px solid #252830', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="pedidos" fill="#f57c24" fillOpacity={0.2} stroke="#f57c24" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-6 pt-4 border-t border-outline flex justify-between">
            <span className="text-sm text-on-surface-variant">Total hoje</span>
            <span className="text-lg font-bold text-primary">{kpis.totalPedidos}</span>
          </div>
        </div>

        <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-secondary/50 shadow-lg hover:shadow-xl hover:shadow-secondary/20 transition-smooth animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-on-background">Funil Vendas</h3>
              <p className="text-on-surface-variant text-sm mt-1">Jornada cliente hoje</p>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowFunilDropdown(!showFunilDropdown)}
                className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center hover:bg-secondary/20 transition-smooth cursor-pointer"
              >
                <span className="material-symbols-outlined text-secondary text-xl">tune</span>
              </button>
              {showFunilDropdown && (
                <div className="absolute top-14 right-0 w-48 bg-surface-container border border-outline rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                  {[
                    { id: 'todas', label: 'Todas', icon: 'tune' },
                    { id: 'whatsapp', label: 'Mensagens WhatsApp', icon: 'chat' },
                    { id: 'visualizacoes', label: 'Visitas Cardápio', icon: 'visibility' },
                    { id: 'addCarrinho', label: 'Adicionar Carrinho', icon: 'add_shopping_cart' },
                    { id: 'checkout', label: 'Inicio Compras', icon: 'shopping_cart' },
                    { id: 'compras', label: 'Compras', icon: 'point_of_sale' }
                  ].map((opcao) => (
                    <button
                      key={opcao.id}
                      onClick={() => {
                        setFunilSelecionado(opcao.id)
                        setShowFunilDropdown(false)
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-container-high transition-smooth ${
                        funilSelecionado === opcao.id ? 'bg-primary/10 text-primary' : 'text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{opcao.icon}</span>
                      <span className="text-sm">{opcao.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {funilSelecionado === 'todas' ? (
              <>
                {[
                  { label: 'Mensagens WhatsApp', value: funilData?.whatsapp || 0, color: '#25d366' },
                  { label: 'Visitas Cardápio', value: funilData?.visualizacoes || kpis.funnelData.visualizacoes || kpis.visualizacoes, color: '#d32f2f' },
                  { label: 'Adicionado Carrinho', value: funilData?.addCarrinho || kpis.funnelData.addCarrinho, color: '#ff9800' },
                  { label: 'Checkout Iniciado', value: funilData?.checkoutIniciado || kpis.funnelData.checkoutIniciado, color: '#ffb74d' },
                  { label: 'Compras Feitas', value: funilData?.compras || kpis.funnelData.compras, color: '#4caf50' }
                ].map((item, i) => {
                  const maxValue = Math.max(funilData?.whatsapp || 0, funilData?.visualizacoes || kpis.funnelData.visualizacoes || kpis.visualizacoes, funilData?.addCarrinho || kpis.funnelData.addCarrinho, funilData?.checkoutIniciado || kpis.funnelData.checkoutIniciado, funilData?.compras || kpis.funnelData.compras, 1)
                  const valorFinal = item.value > 0 ? (item.value / maxValue) * 100 : 0
                  return (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">{item.label}</span>
                      <div className="w-32 h-3 bg-surface-variant rounded-full overflow-hidden group-hover:shadow-lg group-hover:shadow-primary/20">
                        <div 
                          className="h-full rounded-full transition-all" 
                          style={{ 
                            width: `${Math.max(valorFinal, item.value > 0 ? 10 : 0)}%`,
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                      <span className={`font-bold text-sm`} style={{ color: item.color }}>
                        {item.value}
                      </span>
                    </div>
                  )
                })}
              </>
            ) : funilSelecionado === 'whatsapp' ? (
              <div className="flex justify-between items-center group">
                <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">Mensagens WhatsApp</span>
                <span className="text-2xl font-bold text-primary">{funilData?.whatsapp || 0}</span>
              </div>
            ) : funilSelecionado === 'visualizacoes' ? (
              <div className="flex justify-between items-center group">
                <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">Visitas Cardápio</span>
                <span className="text-2xl font-bold" style={{ color: '#d32f2f' }}>{funilData?.visualizacoes || kpis.funnelData.visualizacoes || kpis.visualizacoes || 0}</span>
              </div>
            ) : funilSelecionado === 'addCarrinho' ? (
              <div className="flex justify-between items-center group">
                <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">Adicionar Carrinho</span>
                <span className="text-2xl font-bold" style={{ color: '#ff9800' }}>{funilData?.addCarrinho || kpis.funnelData.addCarrinho || 0}</span>
              </div>
            ) : funilSelecionado === 'checkout' ? (
              <div className="flex justify-between items-center group">
                <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">Início Compras</span>
                <span className="text-2xl font-bold" style={{ color: '#ffb74d' }}>{funilData?.checkoutIniciado || kpis.funnelData.checkoutIniciado || 0}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center group">
                <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">Compras</span>
                <span className="text-2xl font-bold" style={{ color: '#4caf50' }}>{funilData?.compras || kpis.funnelData.compras || 0}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-secondary/50 shadow-lg hover:shadow-xl hover:shadow-secondary/20 transition-smooth animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-on-background">Tempo por Pedido</h3>
              <p className="text-on-surface-variant text-sm mt-1">Média hoje</p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-xl">access_time</span>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Novo → Prep', value: kpis.temposMedios.novo, color: '#2196f3' },
              { label: 'Preparo', value: kpis.temposMedios.preparo, color: '#ff9800' },
              { label: 'Entrega', value: kpis.temposMedios.entrega, color: '#9c27b0' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110 ${item.color === '#ff9800' ? 'bg-secondary/10' : 'bg-surface-variant'}`}>
                    <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>schedule</span>
                  </div>
                  <div>
                    <p className="text-on-surface text-sm font-medium group-hover:text-on-background">{item.label}</p>
                  </div>
                </div>
                <span className={`text-lg font-bold`} style={{ color: item.color }}>
                  {item.value} min
                </span>
              </div>
            ))}
            <div className="pt-4 mt-4 border-t border-outline">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-sm">Total Médio</span>
                <span className="text-2xl font-black text-primary">{kpis.tempoEntrega} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}