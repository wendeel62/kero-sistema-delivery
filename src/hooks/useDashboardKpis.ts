import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { getTenantIdSafe } from '../lib/getTenantId'

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

// ============================================
// TYPES
// ============================================

export interface TemposMedios {
  novo: number
  preparo: number
  entrega: number
  total: number
}

export interface FunnelData {
  visualizacoes: number
  addCarrinho: number
  checkoutIniciado: number
  compras: number
}

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

export interface ProdutoVendido {
  id: string
  nome: string
  totalVendido: number
  quantidade: number
}

export interface FunilRealtimeData {
  visualizacoes: number
  addCarrinho: number
  checkoutIniciado: number
  compras: number
  whatsapp: number
}

export interface ReceitaData {
  receitaPorDia: number[]
  totalReceita: number
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

// ============================================
// HOOK
// ============================================

export function useDashboardKpis() {
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantIdSafe() || '19f48a0b-3117-4d2b-856e-41673dc43275'

  const [linkCardapio, setLinkCardapio] = useState('')
  const [funilSelecionado, setFunilSelecionado] = useState<string>('todas')
  const [showFunilDropdown, setShowFunilDropdown] = useState(false)
  const [receitaDias, setReceitaDias] = useState<number>(7)
  const [showReceitaDropdown, setShowReceitaDropdown] = useState(false)

  // ----- KPIs Query -----
  const { data: kpis = defaultKpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['dashboard-kpis', tenantId],
    queryFn: async (): Promise<KPIs> => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      const { data: pedidosHoje } = await supabase.from('pedidos').select('*').eq('tenant_id', tenantId).gte('created_at', today)
      const { data: pedidosOnlineHoje } = await supabase.from('pedidos_online').select('*').eq('tenant_id', tenantId).gte('created_at', today)

      const allPedidos = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])]
      const validos = allPedidos.filter(p => p.status !== 'cancelado')
      const entregando = allPedidos.filter(p => p.status === 'entregue')
      const abertos = allPedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
      const faturamento = validos.reduce((sum, p) => sum + Number(p.total || 0), 0)

      // Receita 7 dias
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

      // Tempos médios
      const { data: historico } = await supabase
        .from('historico_status')
        .select('pedido_id, status_anterior, status_novo, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)
        .order('created_at', { ascending: true })

      const temposMedios: TemposMedios = { novo: 0, preparo: 0, entrega: 0, total: 0 }
      if (historico && historico.length > 0) {
        const porPedido: Record<string, Array<{ status_anterior: string; status_novo: string; created_at: string }>> = {}
        historico.forEach((h: any) => {
          if (!porPedido[h.pedido_id]) porPedido[h.pedido_id] = []
          porPedido[h.pedido_id].push({ status_anterior: h.status_anterior, status_novo: h.status_novo, created_at: h.created_at })
        })

        let somaNovo = 0, somaPreparo = 0, somaEntrega = 0
        let countNovo = 0, countPreparo = 0, countEntrega = 0

        Object.entries(porPedido).forEach(([pedidoId, mudancas]) => {
          let inicioNovo: number | null = null
          let inicioPreparo: number | null = null
          let inicioEntrega: number | null = null

          const pedido = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])].find((p: any) => p.id === pedidoId)
          if (pedido) inicioNovo = new Date(pedido.created_at).getTime()

          mudancas.forEach(m => {
            const tempo = new Date(m.created_at).getTime()
            if (['pendente', 'aberto', 'confirmado'].includes(m.status_anterior) && m.status_novo === 'preparando') {
              if (inicioNovo) { somaNovo += Math.floor((tempo - inicioNovo) / 60000); countNovo++ }
              inicioPreparo = tempo
            }
            if (m.status_anterior === 'preparando' && ['pronto', 'saiu_entrega'].includes(m.status_novo)) {
              if (inicioPreparo) { somaPreparo += Math.floor((tempo - inicioPreparo) / 60000); countPreparo++ }
              inicioEntrega = tempo
            }
            if (m.status_novo === 'entregue' && m.status_anterior !== 'cancelado') {
              if (inicioEntrega) { somaEntrega += Math.floor((tempo - inicioEntrega) / 60000); countEntrega++ }
            }
          })
        })

        temposMedios.novo = countNovo > 0 ? Math.round(somaNovo / countNovo) : 8
        temposMedios.preparo = countPreparo > 0 ? Math.round(somaPreparo / countPreparo) : 15
        temposMedios.entrega = countEntrega > 0 ? Math.round(somaEntrega / countEntrega) : 12
        temposMedios.total = temposMedios.novo + temposMedios.preparo + temposMedios.entrega
      }

      // NPS
      const { data: npsDataPedidos } = await supabase.from('pedidos').select('nps_nota').eq('tenant_id', tenantId).eq('nps_respondido', true).gte('created_at', today).not('nps_nota', 'is', null)
      const { data: npsDataOnline } = await supabase.from('pedidos_online').select('nps_nota').eq('tenant_id', tenantId).eq('nps_respondido', true).gte('created_at', today).not('nps_nota', 'is', null)
      const allNpsData = [...(npsDataPedidos || []), ...(npsDataOnline || [])]
      const avaliacaoMedia = allNpsData.length > 0 ? Math.round((allNpsData.reduce((sum, p) => sum + (p.nps_nota || 0), 0) / allNpsData.length) * 10) / 10 : 0

      // Eventos jornada
      let visualizacoes = 0, addCarrinho = 0, checkoutIniciado = 0, compras = 0
      try {
        const { data: eventosData } = await supabase.from('eventos_jornada').select('tipo_evento, quantidade').eq('tenant_id', tenantId).gte('data', today)
        const eventos = eventosData || []
        visualizacoes = eventos.filter(e => e.tipo_evento === 'visualizacao').reduce((sum, e) => sum + e.quantidade, 0)
        addCarrinho = eventos.filter(e => e.tipo_evento === 'add_carrinho').reduce((sum, e) => sum + e.quantidade, 0)
        checkoutIniciado = eventos.filter(e => e.tipo_evento === 'checkout_iniciado').reduce((sum, e) => sum + e.quantidade, 0)
        compras = eventos.filter(e => e.tipo_evento === 'compra').reduce((sum, e) => sum + e.quantidade, 0)
      } catch {
        // tabela pode não existir
      }

      // Pedidos por hora
      const pedidosPorHora = Array(24).fill(0)
      allPedidos.forEach(p => { const hour = new Date(p.created_at).getHours(); if (hour >= 0 && hour < 24) pedidosPorHora[hour]++ })
      const { data: pedidosOnlineHojeAll } = await supabase.from('pedidos_online').select('created_at').eq('tenant_id', tenantId).gte('created_at', today)
      if (pedidosOnlineHojeAll) pedidosOnlineHojeAll.forEach(p => { const hour = new Date(p.created_at).getHours(); if (hour >= 0 && hour < 24) pedidosPorHora[hour]++ })

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

  // ----- Pedidos Recentes -----
  const { data: pedidosRecentes = [] as Pedido[], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos-recentes', tenantId],
    queryFn: async () => {
      const { data: pedidos } = await supabase.from('pedidos').select('id, cliente, total, status, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10)
      const { data: pedidosOnline } = await supabase.from('pedidos_online').select('id, cliente, total, status, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10)
      return [...(pedidos || []), ...(pedidosOnline || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10) as Pedido[]
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // ----- Top Produtos -----
  const { data: topProdutos = [] as ProdutoVendido[], isLoading: loadingProdutos } = useQuery({
    queryKey: ['top-produtos', tenantId],
    queryFn: async () => {
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: itensPedido } = await supabase.from('itens_pedido').select('produto_id, quantidade, preco').eq('tenant_id', tenantId).gte('created_at', seteDiasAtras)
      const produtoIds = [...new Set(itensPedido?.map(item => item.produto_id).filter(Boolean) || [])]

      let produtoMap: Record<string, { nome: string; totalVendido: number; quantidade: number }> = {}
      if (produtoIds.length > 0) {
        const { data: produtos } = await supabase.from('produtos').select('id, nome').eq('tenant_id', tenantId).in('id', produtoIds)
        const produtosPorId = (produtos || []).reduce((acc, p) => { acc[p.id] = p.nome; return acc }, {} as Record<string, string>)
        produtoMap = produtoIds.reduce((acc, id) => { acc[id] = { nome: produtosPorId[id] || 'Produto', totalVendido: 0, quantidade: 0 }; return acc }, {} as Record<string, { nome: string; totalVendido: number; quantidade: number }>)
        if (itensPedido) {
          for (const item of itensPedido) {
            if (produtoMap[item.produto_id]) {
              produtoMap[item.produto_id].totalVendido += Number(item.preco) * item.quantidade
              produtoMap[item.produto_id].quantidade += item.quantidade
            }
          }
        }
      }
      return Object.entries(produtoMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.totalVendido - a.totalVendido).slice(0, 5) as ProdutoVendido[]
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // ----- Faturamento 7 Dias (separado para periodo variável) -----
  const { data: faturamento7Dias = [0, 0, 0, 0, 0, 0, 0] as number[], isLoading: loadingFaturamento } = useQuery({
    queryKey: ['faturamento-7dias', tenantId],
    queryFn: async () => {
      const now = new Date()
      const resultado: number[] = [0, 0, 0, 0, 0, 0, 0]
      for (let i = 6; i >= 0; i--) {
        const data = new Date(now); data.setDate(now.getDate() - i)
        const dataStr = data.toISOString().split('T')[0]
        const dataStrProx = new Date(data); dataStrProx.setDate(data.getDate() + 1)
        const { data: pedidosDia } = await supabase.from('pedidos').select('total').eq('tenant_id', tenantId).gte('created_at', dataStr).lt('created_at', dataStrProx.toISOString().split('T')[0]).neq('status', 'cancelado')
        const { data: pedidosOnlineDia } = await supabase.from('pedidos_online').select('total').eq('tenant_id', tenantId).gte('created_at', dataStr).lt('created_at', dataStrProx.toISOString().split('T')[0]).neq('status', 'cancelado')
        resultado[6 - i] = [...(pedidosDia || []), ...(pedidosOnlineDia || [])].reduce((sum, p) => sum + Number(p.total || 0), 0)
      }
      return resultado
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // ----- Config -----
  const { data: configData, isLoading: loadingConfig } = useQuery({
    queryKey: ['configuracoes-loja', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('configuracoes').select('id, loja_aberta, slug, nome_loja').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      return data
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // ----- Funil Realtime -----
  const { data: funilData } = useQuery({
    queryKey: ['funil-tempo-real', tenantId],
    queryFn: async (): Promise<FunilRealtimeData> => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      let visualizacoes = 0, addCarrinho = 0, checkoutIniciado = 0, compras = 0
      try {
        const { data: eventosData } = await supabase.from('eventos_jornada').select('tipo_evento, quantidade').eq('tenant_id', tenantId).gte('data', today)
        const eventos = eventosData || []
        visualizacoes = eventos.filter(e => e.tipo_evento === 'visualizacao').reduce((sum, e) => sum + e.quantidade, 0)
        addCarrinho = eventos.filter(e => e.tipo_evento === 'add_carrinho').reduce((sum, e) => sum + e.quantidade, 0)
        checkoutIniciado = eventos.filter(e => e.tipo_evento === 'checkout_iniciado').reduce((sum, e) => sum + e.quantidade, 0)
        compras = eventos.filter(e => e.tipo_evento === 'compra').reduce((sum, e) => sum + e.quantidade, 0)
      } catch { /* tabela pode não existir */ }

      const { data: whatsAppData } = await supabase.from('mensagens_whatsapp').select('id').eq('tenant_id', tenantId).gte('created_at', today)
      return { visualizacoes, addCarrinho, checkoutIniciado, compras, whatsapp: whatsAppData?.length || 0 }
    },
    staleTime: 10000,
    enabled: !!tenantId,
    refetchInterval: 10000
  })

  // ----- Receita por Periodo -----
  const { data: receitaData } = useQuery({
    queryKey: ['receita-por-periodo', tenantId, receitaDias],
    queryFn: async (): Promise<ReceitaData> => {
      const now = new Date()
      const diasAtras = new Date(); diasAtras.setDate(now.getDate() - receitaDias)
      const isoDiasAtras = diasAtras.toISOString().split('T')[0]
      const { data: pedidosPeriodo } = await supabase.from('pedidos').select('total, created_at').eq('tenant_id', tenantId).gte('created_at', isoDiasAtras).neq('status', 'cancelado')
      const { data: pedidosOnlinePeriodo } = await supabase.from('pedidos_online').select('total, created_at').eq('tenant_id', tenantId).gte('created_at', isoDiasAtras).neq('status', 'cancelado')
      const allPedidosPeriodo = [...(pedidosPeriodo || []), ...(pedidosOnlinePeriodo || [])]
      const receitaPorDia: number[] = []
      for (let i = receitaDias - 1; i >= 0; i--) {
        const data = new Date(now); data.setDate(now.getDate() - i)
        const dataStr = data.toISOString().split('T')[0]
        receitaPorDia.push(allPedidosPeriodo.filter(p => p.created_at && p.created_at.startsWith(dataStr)).reduce((sum, p) => sum + Number(p.total || 0), 0))
      }
      return { receitaPorDia, totalReceita: allPedidosPeriodo.reduce((sum, p) => sum + Number(p.total || 0), 0) }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  // ----- Toggle Loja -----
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

  // ----- Link Cardapio (dinâmico com slug da loja) -----
  useEffect(() => {
    const slug = configData?.slug || (configData?.nome_loja ? slugify(configData.nome_loja) : '')
    if (slug) {
      setLinkCardapio('/cardapio/' + slug)
    }
  }, [configData?.slug, configData?.nome_loja])

  const lojaAberta = configData?.loja_aberta ?? true
  const safeTenantId = tenantId || '19f48a0b-3117-4d2b-856e-41673dc43275'

  // Realtime
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
    ]
  })

  // ----- KPI Cards Data -----
  const kpiData: KpiData[] = [
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

  const isLoading = loadingKpis || loadingPedidos || loadingProdutos || loadingFaturamento || loadingConfig

  return {
    tenantId,
    kpis,
    kpiData,
    pedidosRecentes,
    topProdutos,
    funilData,
    receitaData,
    receitaDias,
    setReceitaDias,
    showReceitaDropdown,
    setShowReceitaDropdown,
    funilSelecionado,
    setFunilSelecionado,
    showFunilDropdown,
    setShowFunilDropdown,
    lojaAberta,
    loadingLoja,
    toggleLoja,
    linkCardapio,
    isLoading,
    formatCurrency,
  }
}
