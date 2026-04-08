import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'

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

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs>({
    faturamento: 0, totalPedidos: 0, ticketMedio: 0, tempoEntrega: 0,
    visualizacoes: 0, avaliacao: 0, totalAvaliacoes: 0, pedidosAbertos: 0, totalEntregues: 0,
    receita7Dias: [0, 0, 0, 0, 0, 0, 0],
    temposMedios: { novo: 0, preparo: 0, entrega: 0, total: 0 },
    funnelData: { visualizacoes: 0, addCarrinho: 0, checkoutIniciado: 0, compras: 0 },
    pedidosPorHora: Array(24).fill(0)
  })
  
  const [linkCardapio, setLinkCardapio] = useState('')
  const [lojaAberta, setLojaAberta] = useState(true)
  const [loadingLoja, setLoadingLoja] = useState(false)

  const fetchKpis = useCallback(async () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const { data: pedidosHoje } = await supabase.from('pedidos').select('*').gte('created_at', today)
    const { data: pedidosOnlineHoje } = await supabase.from('pedidos_online').select('*').gte('created_at', today)

    const allPedidos = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])]
    const validos = allPedidos.filter(p => p.status !== 'cancelado')
    const entregues = allPedidos.filter(p => p.status === 'entregue')
    const abertos = allPedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
    
    const faturamento = validos.reduce((sum, p) => sum + Number(p.total || 0), 0)

    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(now.getDate() - 7)
    const isoSeteDias = seteDiasAtras.toISOString().split('T')[0]

    const { data: p7 } = await supabase.from('pedidos').select('total, created_at').gte('created_at', isoSeteDias).neq('status', 'cancelado')
    const { data: po7 } = await supabase.from('pedidos_online').select('total, created_at').gte('created_at', isoSeteDias).neq('status', 'cancelado')

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
      .eq('nps_respondido', true)
      .gte('created_at', today)
      .not('nps_nota', 'is', null)

    const { data: npsDataOnline } = await supabase
      .from('pedidos_online')
      .select('nps_nota')
      .eq('nps_respondido', true)
      .gte('created_at', today)
      .not('nps_nota', 'is', null)

    const allNpsData = [...(npsDataPedidos || []), ...(npsDataOnline || [])]

    const avaliacaoMedia = allNpsData.length > 0
      ? Math.round((allNpsData.reduce((sum, p) => sum + (p.nps_nota || 0), 0) / allNpsData.length) * 10) / 10
      : 0

    // Fetch dados do funil de vendas
    const { data: eventosData } = await supabase
      .from('eventos_jornada')
      .select('tipo_evento, quantidade')
      .gte('data', today)

    const eventos = eventosData || []
    const visualizacoes = eventos.filter(e => e.tipo_evento === 'visualizacao').reduce((sum, e) => sum + e.quantidade, 0)
    const addCarrinho = eventos.filter(e => e.tipo_evento === 'add_carrinho').reduce((sum, e) => sum + e.quantidade, 0)
    const checkoutIniciado = eventos.filter(e => e.tipo_evento === 'checkout_iniciado').reduce((sum, e) => sum + e.quantidade, 0)
    const compras = eventos.filter(e => e.tipo_evento === 'compra').reduce((sum, e) => sum + e.quantidade, 0)

    // Calcular pedidos por hora (considerando hoje)
    const pedidosPorHora = Array(24).fill(0)
    
    // Processar pedidos internos
    allPedidos.forEach(p => {
      const hour = new Date(p.created_at).getHours()
      if (hour >= 0 && hour < 24) {
        pedidosPorHora[hour]++
      }
    })

    // Processar pedidos online
    const { data: pedidosOnlineHojeAll } = await supabase
      .from('pedidos_online')
      .select('created_at')
      .gte('created_at', today)
    
    if (pedidosOnlineHojeAll) {
      pedidosOnlineHojeAll.forEach(p => {
        const hour = new Date(p.created_at).getHours()
        if (hour >= 0 && hour < 24) {
          pedidosPorHora[hour]++
        }
      })
    }

    setKpis({
      faturamento,
      totalPedidos: allPedidos.length,
      ticketMedio: validos.length > 0 ? faturamento / validos.length : 0,
      tempoEntrega: temposMedios.total,
      visualizacoes,
      avaliacao: avaliacaoMedia,
      totalAvaliacoes: allNpsData.length,
      pedidosAbertos: abertos.length,
      totalEntregues: entregues.length,
      receita7Dias: receitaPorDia,
      temposMedios,
      funnelData: { visualizacoes, addCarrinho, checkoutIniciado, compras },
      pedidosPorHora
    })
  }, [])

  useEffect(() => {
    fetchKpis()
  }, [])
  useEffect(() => {
    setLinkCardapio(window.location.origin + '/cardapio')
  }, [])

  useEffect(() => {
    const fetchLojaStatus = async () => {
      const { data } = await supabase.from('configuracoes').select('id, loja_aberta').order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (data?.loja_aberta !== undefined) {
        setLojaAberta(data.loja_aberta)
      }
    }
    fetchLojaStatus()
  }, [])

  const toggleLoja = async () => {
    setLoadingLoja(true)
    const novoEstado = !lojaAberta
    const { data: existing } = await supabase.from('configuracoes').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle()
    
    if (existing) {
      await supabase.from('configuracoes').update({ loja_aberta: novoEstado }).eq('id', existing.id)
    } else {
      await supabase.from('configuracoes').insert({ loja_aberta: novoEstado })
    }
    
    setLojaAberta(novoEstado)
    setLoadingLoja(false)
  }
  useRealtime('pedidos', fetchKpis)
  useRealtime('pedidos_online', fetchKpis)

  const kpiData = [
    { id: 'faturamento', icon: 'payments', label: 'Faturamento Hoje', value: kpis.faturamento, color: '#e8391a', isCurrency: true },
    { id: 'totalPedidos', icon: 'shopping_cart', label: 'Total Pedidos', value: kpis.totalPedidos, color: '#e8391a' },
    { id: 'pedidosAbertos', icon: 'schedule', label: 'Em Preparo', value: kpis.pedidosAbertos, color: '#f57c24' },
    { id: 'totalEntregues', icon: 'check_circle', label: 'Entregues', value: kpis.totalEntregues, color: '#16a34a', colorClass: 'from-emerald-500/20' },
    { id: 'ticketMedio', icon: 'trending_up', label: 'Ticket Médio', value: kpis.ticketMedio, color: '#f57c24', isCurrency: true },
    { id: 'tempoEntrega', icon: 'timer', label: 'Tempo Médio', value: `${kpis.tempoEntrega} min`, color: '#f57c24' },
    { id: 'avaliacao', icon: 'star', label: 'NPS', value: `${kpis.avaliacao.toFixed(1)}`, color: '#eab308' },
    { id: 'visualizacoes', icon: 'visibility', label: 'Visitas Cardápio', value: kpis.visualizacoes, color: '#e8391a' },
  ]

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const dias = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
  const maxReceita = Math.max(...kpis.receita7Dias, 1)

  const maxPicos = Math.max(...kpis.pedidosPorHora, 1)
  const horaPico = kpis.pedidosPorHora.indexOf(maxPicos)

  return (
    <div className="min-h-screen py-8 px-4 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold font-headline text-white tracking-tight">Dashboard</h1>
          <p className="text-white/60 mt-1 text-lg">Visão geral do dia</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleLoja}
            disabled={loadingLoja}
            className={`px-6 py-3 rounded-lg font-bold border-2 transition-all flex items-center gap-2 text-sm ${
              lojaAberta
                ? 'border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-400 text-emerald-400 hover:bg-emerald-500/10 shadow-lg'
                : 'border-red-500/50 bg-red-500/5 hover:border-red-400 text-red-400 hover:bg-red-500/10 shadow-lg'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${lojaAberta ? 'bg-emerald-400 shadow-lg' : 'bg-red-400'}`} />
            {lojaAberta ? 'Loja Aberta' : 'Loja Fechada'}
          </button>
          <a 
            href={linkCardapio} 
            target="_blank" 
            className="px-6 py-3 bg-gradient-to-r from-[#e8391a] to-[#f57c24]/80 hover:from-[#e8391a]/90 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all border border-transparent flex items-center gap-2 text-sm"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined !text-lg">qr_code_scanner</span>
            Abrir Cardápio
          </a>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {kpiData.map((kpi, i) => (
          <div key={kpi.id} className="group p-6 rounded-2xl border border-white/10 bg-surface-container hover:border-white/20 hover:bg-surface-container-high shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.color === '#e8391a' || kpi.color === '#f57c24' ? `bg-[${kpi.color}]/10` : 'bg-white/5'}`}>
                  <span className="material-symbols-outlined text-xl" style={{ color: kpi.color }}>
                    {kpi.icon}
                  </span>
                </div>
                <div>
                  <p className="text-white/60 text-sm uppercase tracking-wide font-medium">{kpi.label}</p>
                </div>
              </div>
              <div className={`text-2xl lg:text-3xl font-black ${kpi.color === '#e8391a' ? 'text-[#e8391a]' : kpi.color === '#f57c24' ? 'text-[#f57c24]' : 'text-white'}`}>
                {kpi.isCurrency ? formatCurrency(kpi.value as number) : kpi.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita 7 Dias */}
        <div className="p-6 lg:p-8 rounded-2xl border border-white/10 bg-surface-container hover:border-white/20 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Receita 7 Dias</h3>
              <p className="text-white/50 text-sm mt-1">Vendas diárias</p>
            </div>
            <div className="w-12 h-12 bg-[#e8391a]/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e8391a] text-xl">bar_chart</span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 h-32 items-end">
            {kpis.receita7Dias.map((valor, i) => (
              <div key={i} className="flex flex-col items-center">
                <div 
                  className="w-4 rounded transition-all duration-700" 
                  style={{ 
                    height: `${(valor / maxReceita) * 100}%`,
                    background: valor === kpis.receita7Dias[6] ? 'linear-gradient(to top, #e8391a, #ff6b47)' : '#f57c24'
                  }}
                />
                <span className="text-xs text-white/50 mt-1">{dias[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Picos por Hora */}
        <div className="p-6 lg:p-8 rounded-2xl border border-white/10 bg-surface-container hover:border-white/20 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Picos Hora</h3>
              <p className="text-white/50 text-sm mt-1">Hoje</p>
            </div>
            <div className="w-12 h-12 bg-[#f57c24]/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f57c24] text-xl">insights</span>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-1 h-32 items-end">
            {kpis.pedidosPorHora.map((count, hour) => (
              <div key={hour} className="flex flex-col items-center">
                <div 
                  className={`w-3 rounded transition-all ${count === maxPicos ? 'bg-[#e8391a]' : 'bg-[#f57c24]/60'}`} 
                  style={{ height: `${(count / maxPicos) * 100}%` }}
                />
                {hour % 3 === 0 && <span className="text-[10px] text-white/40">{hour}h</span>}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between">
            <span className="text-sm text-white/60">Total hoje</span>
            <span className="text-lg font-bold text-[#e8391a]">{kpis.totalPedidos}</span>
          </div>
        </div>

        {/* Funil Vendas */}
        <div className="p-6 lg:p-8 rounded-2xl border border-white/10 bg-surface-container hover:border-white/20 shadow-lg hover:shadow-xl transition-all col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Funil Vendas</h3>
              <p className="text-white/50 text-sm mt-1">Jornada cliente hoje</p>
            </div>
            <div className="w-12 h-12 bg-[#f57c24]/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f57c24] text-xl">tune</span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Visitas Cardápio', value: kpis.funnelData.visualizacoes || kpis.visualizacoes, color: '#e8391a' },
              { label: 'Adicionado Carrinho', value: kpis.funnelData.addCarrinho, color: '#f57c24' },
              { label: 'Checkout Iniciado', value: kpis.funnelData.checkoutIniciado, color: '#eab308' },
              { label: 'Compras Feitas', value: kpis.funnelData.compras, color: '#16a34a' }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-white/80">{item.label}</span>
                <div className="w-32 h-3 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all" 
                    style={{ 
                      width: item.value > 0 ? '75%' : '40%', 
                      backgroundColor: item.color 
                    }}
                  />
                </div>
                <span className={`font-bold text-sm ${item.color === '#e8391a' ? 'text-[#e8391a]' : item.color === '#f57c24' ? 'text-[#f57c24]' : 'text-white'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tempos Médios */}
        <div className="p-6 lg:p-8 rounded-2xl border border-white/10 bg-surface-container hover:border-white/20 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Tempo por Etapa</h3>
              <p className="text-white/50 text-sm mt-1">Média hoje</p>
            </div>
            <div className="w-12 h-12 bg-[#f57c24]/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f57c24] text-xl">access_time</span>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Novo → Prep', value: kpis.temposMedios.novo, color: '#3b82f6' },
              { label: 'Preparo', value: kpis.temposMedios.preparo, color: '#f59e0b' },
              { label: 'Entrega', value: kpis.temposMedios.entrega, color: '#8b5cf6' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color === '#f59e0b' ? 'bg-[#f59e0b]/10' : 'bg-white/5'}`}>
                    <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>schedule</span>
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">{item.label}</p>
                  </div>
                </div>
                <span className={`text-lg font-bold ${item.color === '#f59e0b' ? 'text-[#f59e0b]' : 'text-white'}`}>
                  {item.value} min
                </span>
              </div>
            ))}
            <div className="pt-4 mt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Total Médio</span>
                <span className="text-2xl font-black text-[#e8391a]">{kpis.tempoEntrega} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

