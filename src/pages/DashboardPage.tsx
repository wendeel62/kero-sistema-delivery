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

interface FunnelData {
  visualizacoes: number
  addCarrinho: number
  checkoutIniciado: number
  compras: number
}

interface KpiData {
  id: string;
  icon: string;
  label: string;
  value: string | number;
  colorClass?: string;
  isCurrency?: boolean;
}

function KpiCard({ 
  data, 
  index, 
  onDragStart, 
  onDrop, 
  isDragging 
}: {
  data: KpiData; 
  index: number;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string) => void;
  isDragging: boolean;
}) {
  const valueDisplay = data.isCurrency 
    ? data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : String(data.value);

  const colorMap: Record<string, string> = {
    'faturamento': 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
    'totalPedidos': 'from-[#e8391a]/20 to-[#e8391a]/5 border-[#e8391a]/30',
    'ticketMedio': 'from-[#f57c24]/20 to-[#f57c24]/5 border-[#f57c24]/30',
    'pedidosAbertos': 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
    'totalEntregues': 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
    'tempoEntrega': 'from-[#f57c24]/20 to-[#f57c24]/5 border-[#f57c24]/30',
    'avaliacao': 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    'visualizacoes': 'from-[#e8391a]/20 to-[#e8391a]/5 border-[#e8391a]/30',
  }

  const iconColorMap: Record<string, string> = {
    'faturamento': 'text-emerald-400 bg-emerald-500/20',
    'totalPedidos': 'text-[#e8391a] bg-[#e8391a]/20',
    'ticketMedio': 'text-[#f57c24] bg-[#f57c24]/20',
    'pedidosAbertos': 'text-orange-400 bg-orange-500/20',
    'totalEntregues': 'text-emerald-400 bg-emerald-500/20',
    'tempoEntrega': 'text-[#f57c24] bg-[#f57c24]/20',
    'avaliacao': 'text-yellow-400 bg-yellow-500/20',
    'visualizacoes': 'text-[#e8391a] bg-[#e8391a]/20',
  }

  const textColorMap: Record<string, string> = {
    'faturamento': 'text-emerald-400',
    'totalPedidos': 'text-[#e8391a]',
    'ticketMedio': 'text-[#f57c24]',
    'pedidosAbertos': 'text-orange-400',
    'totalEntregues': 'text-emerald-400',
    'tempoEntrega': 'text-[#f57c24]',
    'avaliacao': 'text-yellow-400',
    'visualizacoes': 'text-[#e8391a]',
  }

  return (
    <div 
      draggable
      onDragStart={() => onDragStart(data.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(data.id)}
      style={{ animationDelay: `${index * 80}ms` }}
      className={`relative overflow-hidden bg-gradient-to-br ${colorMap[data.id] || 'from-gray-500/20 to-gray-500/5 border-gray-500/30'} p-3 lg:p-6 rounded-xl lg:rounded-2xl border transition-all duration-300 cursor-grab active:cursor-grabbing animate-fade-in ${
        isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.02] hover:shadow-lg'
      }`}
    >
      <div className="absolute top-0 right-0 w-16 lg:w-32 h-16 lg:h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col">
          <span className="text-[9px] lg:text-[11px] font-bold text-white/50 uppercase tracking-widest lg:mb-2">{data.label}</span>
          <div className="h-0.5 w-6 lg:w-8 bg-white/20 rounded-full" />
        </div>
        <div className={`w-8 lg:w-11 h-8 lg:h-11 rounded-lg lg:rounded-xl flex items-center justify-center ${iconColorMap[data.id] || 'bg-white/10 text-white'}`}>
          <span className="material-symbols-outlined text-lg lg:text-xl">{data.icon}</span>
        </div>
      </div>
      
      <h3 className={`text-xl lg:text-3xl font-bold mt-3 lg:mt-5 tracking-tight ${textColorMap[data.id] || 'text-white'}`}>
        {valueDisplay}
      </h3>
    </div>
  )
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
  
  const [order, setOrder] = useState<string[]>([
    'faturamento', 'totalPedidos', 'ticketMedio', 'pedidosAbertos',
    'totalEntregues', 'tempoEntrega', 'avaliacao', 'visualizacoes'
  ])
  
  const [draggedKpi, setDraggedKpi] = useState<string | null>(null)
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
      visualizacoes: (pedidosOnlineHoje?.length || 0) * 42,
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

  useEffect(() => { fetchKpis() }, [fetchKpis])
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

  const handleDropKpi = (targetId: string) => {
    if (!draggedKpi || draggedKpi === targetId) return
    const newOrder = [...order]
    const dIdx = newOrder.indexOf(draggedKpi)
    const tIdx = newOrder.indexOf(targetId)
    newOrder.splice(dIdx, 1)
    newOrder.splice(tIdx, 0, draggedKpi)
    setOrder(newOrder)
    setDraggedKpi(null)
  }

  const [chartsOrder, setChartsOrder] = useState<string[]>(['receita', 'picos', 'funil', 'tempos'])
  const [draggedChart, setDraggedChart] = useState<string | null>(null)

  const handleDropCharts = (targetId: string) => {
    if (!draggedChart || draggedChart === targetId) return
    const newOrder = [...chartsOrder]
    const dIdx = newOrder.indexOf(draggedChart)
    const tIdx = newOrder.indexOf(targetId)
    newOrder.splice(dIdx, 1)
    newOrder.splice(tIdx, 0, draggedChart)
    setChartsOrder(newOrder)
    setDraggedChart(null)
  }

  const kpiMap: Record<string, KpiData> = {
    faturamento: { id: 'faturamento', icon: 'payments', label: 'Faturamento', value: kpis.faturamento, isCurrency: true },
    totalPedidos: { id: 'totalPedidos', icon: 'local_mall', label: 'Pedidos Total', value: kpis.totalPedidos },
    ticketMedio: { id: 'ticketMedio', icon: 'trending_up', label: 'Ticket Médio', value: kpis.ticketMedio, isCurrency: true },
    pedidosAbertos: { id: 'pedidosAbertos', icon: 'pending_actions', label: 'Em Preparo', value: kpis.pedidosAbertos },
    totalEntregues: { id: 'totalEntregues', icon: 'check_circle', label: 'Entregues', value: kpis.totalEntregues },
    tempoEntrega: { id: 'tempoEntrega', icon: 'schedule', label: 'Tempo Médio', value: `${kpis.tempoEntrega} min` },
    avaliacao: { 
      id: 'avaliacao', 
      icon: 'star', 
      label: 'Avaliação NPS', 
      value: kpis.totalAvaliacoes > 0 
        ? `${kpis.avaliacao.toFixed(1)} (${kpis.totalAvaliacoes})`
        : '0.0 (sem)', 
    },
    visualizacoes: { id: 'visualizacoes', icon: 'visibility', label: 'Visitas', value: kpis.visualizacoes },
  }

  const renderChart = (id: string) => {
    const commonClass = `bg-[#16181f] p-3 lg:p-6 rounded-xl lg:rounded-2xl border border-[#252830] transition-all duration-300 animate-fade-in relative group cursor-grab active:cursor-grabbing ${draggedChart === id ? 'opacity-30 scale-95' : 'hover:border-[#e8391a]/30'}`
    const dragProps = {
      draggable: true,
      onDragStart: () => setDraggedChart(id),
      onDragOver: (e: any) => e.preventDefault(),
      onDrop: () => handleDropCharts(id)
    }

    if (id === 'receita') {
      const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      const max = Math.max(...kpis.receita7Dias, 1)
      
      return (
        <div key="receita" {...dragProps} className={commonClass} style={{ animationDelay: '400ms' }}>
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <div>
              <h3 className="text-base lg:text-lg font-bold text-white">Receita dos Últimos 7 Dias</h3>
              <p className="text-[10px] lg:text-xs text-white/40 mt-0.5 lg:mt-1">Volume de vendas diário</p>
            </div>
            <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-[#e8391a]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e8391a] text-lg lg:text-xl">bar_chart</span>
            </div>
          </div>
          
          <div className="h-28 lg:h-44 flex items-end justify-between gap-1 lg:gap-2 px-0.5">
            {kpis.receita7Dias.map((valor, i) => {
              const height = (valor / max) * 100
              const isToday = i === 6
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 lg:gap-2 group/bar">
                  <div className="w-full relative flex items-end justify-center h-full">
                    <div 
                      className={`w-full max-w-[16px] lg:max-w-[28px] rounded-t-sm lg:rounded-t-md transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-[#e8391a] to-[#ff6b4a] shadow-lg shadow-[#e8391a]/20' : 'bg-[#252830] group-hover/bar:bg-[#e8391a]/30'}`} 
                      style={{ height: `${Math.max(height, 8)}%` }} 
                    />
                    {valor > 0 && (
                      <div className="absolute -top-5 lg:-top-7 bg-[#1a1a1a] px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-[8px] lg:text-[10px] font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 border border-[#252830]">
                        R$ {valor.toFixed(0)}
                      </div>
                    )}
                  </div>
                  <span className={`text-[7px] lg:text-[9px] font-medium ${isToday ? 'text-[#e8391a]' : 'text-white/30'}`}>{dias[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (id === 'picos') {
      const pedidosPorHora = kpis.pedidosPorHora
      const maxPedidos = Math.max(...pedidosPorHora, 1)
      const totalPedidos = pedidosPorHora.reduce((a, b) => a + b, 0)
      const horaPico = pedidosPorHora.indexOf(maxPedidos)
      
      return (
        <div key="picos" {...dragProps} className={commonClass} style={{ animationDelay: '500ms' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Picos por Hora</h3>
              <p className="text-xs text-white/40 mt-1">Pedidos por hora hoje</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#f57c24]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f57c24]">insights</span>
            </div>
          </div>
          
          <div className="h-32 flex items-end justify-between gap-1">
            {pedidosPorHora.map((count, hour) => {
              const height = maxPedidos > 0 ? (count / maxPedidos) * 100 : 0
              const isPico = count === maxPedidos && count > 0
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full relative flex items-end justify-center h-full">
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-300 ${isPico ? 'bg-gradient-to-t from-[#e8391a] to-[#ff6b4a] shadow-lg' : 'bg-[#252830] group-hover:bg-[#f57c24]/50'}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    {count > 0 && (
                      <div className="absolute -top-6 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#1a1a1a] px-1.5 py-0.5 rounded">
                        {count}
                      </div>
                    )}
                  </div>
                  {hour % 4 === 0 && (
                    <span className="text-[8px] text-white/30">{String(hour).padStart(2, '0')}</span>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 flex justify-between items-center pt-3 border-t border-[#252830]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#e8391a]" />
              <span className="text-xs text-white/50">Total hoje</span>
              <span className="text-sm font-bold text-white">{totalPedidos}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#f57c24]" />
              <span className="text-xs text-white/50">Pico às</span>
              <span className="text-sm font-bold text-white">{String(horaPico).padStart(2, '0')}:00</span>
              <span className="text-xs text-[#f57c24]">({maxPedidos})</span>
            </div>
          </div>
        </div>
      )
    }

    if (id === 'funil') {
      const funnelItems = [
        { label: 'WhatsApp/Cards', value: kpis.funnelData.visualizacoes || kpis.visualizacoes, w: 'w-full' },
        { label: 'Visualização Cardápio', value: kpis.funnelData.visualizacoes, w: kpis.funnelData.visualizacoes ? 'w-[85%]' : 'w-0' },
        { label: 'Adição ao Carrinho', value: kpis.funnelData.addCarrinho, w: kpis.funnelData.addCarrinho && kpis.funnelData.visualizacoes ? `w-[${Math.min(100, Math.round((kpis.funnelData.addCarrinho / kpis.funnelData.visualizacoes) * 100))}%)]` : 'w-0' },
        { label: 'Checkout Iniciado', value: kpis.funnelData.checkoutIniciado, w: kpis.funnelData.checkoutIniciado && kpis.funnelData.addCarrinho ? `w-[${Math.min(100, Math.round((kpis.funnelData.checkoutIniciado / kpis.funnelData.addCarrinho) * 100))}%)]` : 'w-0' },
        { label: 'Compras Concluídas', value: kpis.funnelData.compras || kpis.totalEntregues, w: kpis.funnelData.compras && kpis.funnelData.checkoutIniciado ? `w-[${Math.min(100, Math.round((kpis.funnelData.compras / kpis.funnelData.checkoutIniciado) * 100))}%)]` : 'w-[40%]' },
      ]
      
      // Calculate widths dynamically based on max value
      const maxValue = Math.max(...funnelItems.map(i => i.value), 1)
      const dynamicWidths = funnelItems.map(item => {
        if (item.value === 0) return 'w-0'
        const percent = (item.value / maxValue) * 100
        return `w-[${percent}%]`
      })
      
      const colors = ['bg-[#e8391a]', 'bg-pink-500', 'bg-[#f57c24]', 'bg-yellow-500', 'bg-emerald-500']
      const textColors = ['text-[#e8391a]', 'text-pink-400', 'text-[#f57c24]', 'text-yellow-500', 'text-emerald-400']
      
      const getWidth = (i: number) => {
        const item = funnelItems[i]
        if (item.value === 0) return 'w-0'
        return dynamicWidths[i]
      }
      
      return (
        <div key="funil" {...dragProps} className={commonClass} style={{ animationDelay: '600ms' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Funil de Vendas</h3>
              <p className="text-xs text-white/40 mt-1">Jornada do cliente</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-500">filter_alt</span>
            </div>
          </div>
          <div className="space-y-3">
            {funnelItems.map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">{item.label}</span>
                  <span className={`text-sm font-bold ${textColors[i]}`}>{item.value}</span>
                </div>
                <div className="h-5 bg-[#1c1e26] rounded-md overflow-hidden">
                   <div className={`h-full ${colors[i]} ${getWidth(i)} transition-all duration-700 flex items-center justify-end pr-2`}>
                      {item.value > 0 && <div className="w-1.5 h-1.5 rounded-full bg-white/80" />}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (id === 'tempos') {
      const totalTempo = kpis.temposMedios.total || 1
      const temposDetalhes = [
        { label: 'Novo', tempo: kpis.temposMedios.novo, cor: 'bg-blue-500', icone: 'fiber_new' },
        { label: 'Preparo', tempo: kpis.temposMedios.preparo, cor: 'bg-orange-500', icone: 'skillet' },
        { label: 'Entrega', tempo: kpis.temposMedios.entrega, cor: 'bg-purple-500', icone: 'delivery_dining' },
      ]

      return (
        <div key="tempos" {...dragProps} className={commonClass} style={{ animationDelay: '700ms' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Tempo por Etapa</h3>
              <p className="text-xs text-white/40 mt-1">Tempo médio em minutos</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#f57c24]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#f57c24]">timer</span>
            </div>
          </div>
          
          <div className="space-y-4 mb-4">
            {temposDetalhes.map((etapa, i) => {
              const porcentagem = (etapa.tempo / totalTempo) * 100
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${etapa.cor.replace('bg-', 'text-')}`}>{etapa.icone}</span>
                      <span className="text-sm font-medium text-white">{etapa.label}</span>
                    </div>
                    <span className={`text-lg font-bold ${etapa.cor.replace('bg-', 'text-')}`}>
                      {etapa.tempo} min
                    </span>
                  </div>
                  <div className="h-2 bg-[#1c1e26] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${etapa.cor} rounded-full transition-all duration-700`}
                      style={{ width: `${porcentagem}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-[#1c1e26] p-4 rounded-xl border border-[#252830]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium uppercase tracking-wider text-white/50">Total Médio</span>
              <span className="text-2xl font-bold text-[#e8391a]">{kpis.temposMedios.total} min</span>
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6 px-2 lg:px-0">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 lg:gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-white/50 mt-1 text-sm lg:text-base">Visão geral do seu estabelecimento</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <button
            onClick={toggleLoja}
            disabled={loadingLoja}
            className={`flex items-center gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-xl border transition-all text-xs lg:text-sm ${
              lojaAberta 
                ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${lojaAberta ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
            <span className={`font-bold uppercase tracking-wider ${lojaAberta ? 'text-emerald-400' : 'text-red-400'}`}>
              {lojaAberta ? 'Loja Aberta' : 'Loja Fechada'}
            </span>
          </button>
          
          <a 
            href={linkCardapio} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#e8391a]/10 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl border border-[#e8391a]/30 hover:bg-[#e8391a]/20 transition-all group"
          >
            <span className="material-symbols-outlined text-[#e8391a]">qr_code_2</span>
            <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-[#e8391a] hidden sm:inline">Cardápio</span>
            <span className="material-symbols-outlined text-[#e8391a]/60 text-sm group-hover:translate-x-0.5 transition-transform">open_in_new</span>
          </a>
          
          <button
            onClick={() => navigator.clipboard.writeText(linkCardapio)}
            className="p-2 lg:p-2.5 bg-[#16181f] rounded-xl border border-[#252830] hover:border-[#e8391a]/30 transition-all"
            title="Copiar Link"
          >
            <span className="material-symbols-outlined text-white/60 text-lg">content_copy</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        {order.map((id, index) => (
          <KpiCard key={id} data={kpiMap[id]} index={index} onDragStart={setDraggedKpi} onDrop={handleDropKpi} isDragging={draggedKpi === id} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-4">
        {chartsOrder.map(renderChart)}
      </div>
    </div>
  )
}
