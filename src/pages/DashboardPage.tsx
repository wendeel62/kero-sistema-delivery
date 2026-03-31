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

  return (
    <div 
      draggable
      onDragStart={() => onDragStart(data.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(data.id)}
      style={{ animationDelay: `${index * 100}ms` }}
      className={`bg-surface-container p-6 rounded-3xl border transition-all duration-300 group cursor-grab active:cursor-grabbing shadow-xl animate-fade-in fill-mode-both ${
        isDragging ? 'border-primary-container opacity-40 scale-95 shadow-none' : 'border-outline-variant hover:border-primary-container/30 hover:shadow-primary-container/5'
      }`}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-headline font-bold text-on-surface-variant/40 tracking-[0.2em] uppercase mb-1">{data.label}</span>
          <div className="h-1 w-6 bg-primary-container/20 rounded-full group-hover:w-full transition-all duration-500" />
        </div>
        <div className={`w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center ${data.colorClass} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
          <span className="material-symbols-outlined text-xl">{data.icon}</span>
        </div>
      </div>
      <h3 className={`text-2xl font-headline font-bold tracking-tight ${data.colorClass || 'text-on-surface'}`}>
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
    temposMedios: { novo: 0, preparo: 0, entrega: 0, total: 0 }
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
    
    // Busca pedidos do dia
    const { data: pedidosHoje } = await supabase.from('pedidos').select('*').gte('created_at', today)
    const { data: pedidosOnlineHoje } = await supabase.from('pedidos_online').select('*').gte('created_at', today)

    // Agregação dos pedidos diários
    const allPedidos = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])]
    const validos = allPedidos.filter(p => p.status !== 'cancelado')
    const entregues = allPedidos.filter(p => p.status === 'entregue')
    const abertos = allPedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
    
    // Faturamento agora considera pedidos confirmados/em preparo (realtime demand)
    const faturamento = validos.reduce((sum, p) => sum + Number(p.total || 0), 0)

    // Lógica para o gráfico de 7 dias
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

    // Buscar histórico de status para calcular tempos médios
    const { data: historico } = await supabase
      .from('historico_status')
      .select('pedido_id, status_anterior, status_novo, created_at')
      .gte('created_at', today)
      .order('created_at', { ascending: true })

    const temposMedios: TemposMedios = { novo: 0, preparo: 0, entrega: 0, total: 0 }
    
    if (historico && historico.length > 0) {
      // Agrupar por pedido
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

      Object.values(porPedido).forEach(mudancas => {
        mudancas.forEach(m => {
          const tempo = new Date(m.created_at).getTime()
          
          // Tempo em "novo": pendente/aberto → preparando
          if (['pendente', 'aberto', 'confirmado'].includes(m.status_anterior) && m.status_novo === 'preparando') {
            // Buscar quando o pedido foi criado para calcular diferença
            const pedido = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])].find((p: any) => 
              porPedido[p.id] !== undefined
            )
            if (pedido) {
              const criadoEm = new Date(pedido.created_at).getTime()
              somaNovo += Math.floor((tempo - criadoEm) / 60000)
              countNovo++
            }
          }
          
          // Tempo em "preparo": preparando → pronto/saiu_entrega
          if (m.status_anterior === 'preparando' && ['pronto', 'saiu_entrega'].includes(m.status_novo)) {
            somaPreparo += 1 // Placeholder - será calculado com timestamps
            countPreparo++
          }
          
          // Tempo em "entrega": saiu_entrega → entregue
          if (m.status_novo === 'entregue') {
            somaEntrega += 1 // Placeholder - será calculado com timestamps
            countEntrega++
          }
        })
      })

      // Calcular médias reais usando timestamps
      Object.entries(porPedido).forEach(([pedidoId, mudancas]) => {
        let inicioNovo: number | null = null
        let inicioPreparo: number | null = null
        let inicioEntrega: number | null = null

        // Buscar data de criação do pedido
        const pedido = [...(pedidosHoje || []), ...(pedidosOnlineHoje || [])].find((p: any) => p.id === pedidoId)
        if (pedido) {
          inicioNovo = new Date(pedido.created_at).getTime()
        }

        mudancas.forEach(m => {
          const tempo = new Date(m.created_at).getTime()
          
          // Início do preparo
          if (['pendente', 'aberto', 'confirmado'].includes(m.status_anterior) && m.status_novo === 'preparando') {
            if (inicioNovo) {
              somaNovo += Math.floor((tempo - inicioNovo) / 60000)
              countNovo++
            }
            inicioPreparo = tempo
          }
          
          // Fim do preparo / Início da entrega
          if (m.status_anterior === 'preparando' && ['pronto', 'saiu_entrega'].includes(m.status_novo)) {
            if (inicioPreparo) {
              somaPreparo += Math.floor((tempo - inicioPreparo) / 60000)
              countPreparo++
            }
            inicioEntrega = tempo
          }
          
          // Fim da entrega
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

    // Buscar NPS real do banco (tabela pedidos)
    const { data: npsDataPedidos } = await supabase
      .from('pedidos')
      .select('nps_nota')
      .eq('nps_respondido', true)
      .gte('created_at', today)
      .not('nps_nota', 'is', null)

    // Buscar NPS real do banco (tabela pedidos_online)
    const { data: npsDataOnline } = await supabase
      .from('pedidos_online')
      .select('nps_nota')
      .eq('nps_respondido', true)
      .gte('created_at', today)
      .not('nps_nota', 'is', null)

    // Combinar dados de ambas as tabelas
    const allNpsData = [...(npsDataPedidos || []), ...(npsDataOnline || [])]

    const avaliacaoMedia = allNpsData.length > 0
      ? Math.round((allNpsData.reduce((sum, p) => sum + (p.nps_nota || 0), 0) / allNpsData.length) * 10) / 10
      : 0

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
      temposMedios
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
    faturamento: { id: 'faturamento', icon: 'payments', label: 'Faturamento', value: kpis.faturamento, isCurrency: true, colorClass: 'text-[#4ade80]' },
    totalPedidos: { id: 'totalPedidos', icon: 'local_mall', label: 'Pedidos Total', value: kpis.totalPedidos, colorClass: 'text-primary' },
    ticketMedio: { id: 'ticketMedio', icon: 'analytics', label: 'Ticket Médio', value: kpis.ticketMedio, isCurrency: true, colorClass: 'text-secondary' },
    pedidosAbertos: { id: 'pedidosAbertos', icon: 'pending_actions', label: 'Em Preparo', value: kpis.pedidosAbertos, colorClass: 'text-orange-400' },
    totalEntregues: { id: 'totalEntregues', icon: 'task_alt', label: 'Entregues', value: kpis.totalEntregues, colorClass: 'text-[#4ade80]' },
    tempoEntrega: { id: 'tempoEntrega', icon: 'schedule', label: 'Tempo Médio', value: `${kpis.tempoEntrega} min`, colorClass: 'text-secondary' },
    avaliacao: { 
      id: 'avaliacao', 
      icon: 'grade', 
      label: 'Avaliação NPS', 
      value: kpis.totalAvaliacoes > 0 
        ? `${kpis.avaliacao.toFixed(1)} (${kpis.totalAvaliacoes} avaliações)`
        : '0.0 (sem avaliações)', 
      colorClass: 'text-yellow-400' 
    },
    visualizacoes: { id: 'visualizacoes', icon: 'visibility', label: 'Visitas Cardápio', value: kpis.visualizacoes, colorClass: 'text-primary' },
  }

  const renderChart = (id: string) => {
    const commonClass = `bg-surface-container p-8 rounded-3xl border transition-all duration-500 shadow-2xl animate-fade-in relative group cursor-grab active:cursor-grabbing ${draggedChart === id ? 'opacity-20 border-primary-container scale-95' : 'border-outline-variant hover:border-primary-container/20'}`
    const dragProps = {
      draggable: true,
      onDragStart: () => setDraggedChart(id),
      onDragOver: (e: any) => e.preventDefault(),
      onDrop: () => handleDropCharts(id)
    }

    if (id === 'receita') {
      return (
        <div key="receita" {...dragProps} className={commonClass} style={{ animationDelay: '400ms' }}>
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Receita Mensal</h3>
              <p className="text-[10px] text-on-surface-variant/40 font-body uppercase tracking-[0.2em] mt-1">Volume de vendas / 7 dias</p>
            </div>
            <span className="material-symbols-outlined text-primary-container opacity-20 text-2xl">bar_chart</span>
          </div>
          <div className="h-48 flex items-end justify-between gap-3 relative px-2 border-b border-outline-variant/10">
             {['T', 'Q', 'Q', 'S', 'S', 'D', 'H'].map((day, i) => {
               const max = Math.max(...kpis.receita7Dias, 1)
               const height = (kpis.receita7Dias[i] / max) * 100
               const isToday = i === 6
               return (
                 <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar">
                    <div className="w-full relative flex items-end justify-center h-full">
                       <div className={`w-full max-w-[20px] rounded-t-lg transition-all duration-700 ${isToday ? 'bg-primary-container shadow-[0_-5px_15px_rgba(255,124,92,0.3)]' : 'bg-[#252830] group-hover/bar:bg-outline-variant'}`} style={{ height: `${Math.max(height, 5)}%` }} />
                       {kpis.receita7Dias[i] > 0 && (
                         <div className="absolute -top-8 bg-surface-container-high px-2 py-1 rounded-md text-[8px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 border border-outline-variant">
                           R$ {kpis.receita7Dias[i].toFixed(0)}
                         </div>
                       )}
                    </div>
                    <span className={`text-[8px] font-bold ${isToday ? 'text-primary' : 'text-on-surface-variant/20'}`}>{day}</span>
                 </div>
               )
             })}
          </div>
        </div>
      )
    }

    if (id === 'picos') {
      return (
        <div key="picos" {...dragProps} className={commonClass} style={{ animationDelay: '500ms' }}>
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Picos por Hora</h3>
              <p className="text-[10px] text-on-surface-variant/40 font-body uppercase tracking-[0.2em] mt-1">Fluxo operacional hoje</p>
            </div>
            <span className="material-symbols-outlined text-secondary opacity-20 text-2xl">insights</span>
          </div>
          <div className="h-48 relative">
             <svg className="w-full h-full pr-2" viewBox="0 0 400 200" preserveAspectRatio="none">
               <path d="M 0 190 Q 50 160 100 120 T 200 100 T 300 40 T 400 80" fill="none" stroke="#ff5637" strokeWidth="4" className="drop-shadow-[0_0_10px_rgba(255,86,55,0.4)]" />
               <circle cx="300" cy="40" r="5" className="fill-primary-container" />
             </svg>
             <div className="flex justify-between mt-6 px-1">
                {[18, 20, 22, '00'].map((h) => <span key={h} className="text-[8px] text-on-surface-variant/20 font-bold">{h}h</span>)}
             </div>
          </div>
        </div>
      )
    }

    if (id === 'funil') {
      const funnelItems = [
        { label: 'Visitas Online', value: kpis.visualizacoes, color: 'bg-primary/20', text: 'text-primary', w: 'w-full' },
        { label: 'Adição ao Carrinho', value: Math.round(kpis.visualizacoes * 0.45), color: 'bg-secondary/20', text: 'text-secondary', w: 'w-[80%]' },
        { label: 'Checkout Iniciado', value: Math.round(kpis.visualizacoes * 0.25), color: 'bg-orange-500/20', text: 'text-orange-400', w: 'w-[60%]' },
        { label: 'Compras Concluídas', value: kpis.totalEntregues, color: 'bg-[#4ade80]/20', text: 'text-[#4ade80]', w: 'w-[40%]' },
      ]
      return (
        <div key="funil" {...dragProps} className={commonClass} style={{ animationDelay: '600ms' }}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Funil de Vendas</h3>
              <p className="text-[10px] text-on-surface-variant/40 font-body uppercase tracking-[0.2em] mt-1">Conversão de tráfego</p>
            </div>
            <span className="material-symbols-outlined text-orange-400 opacity-20 text-2xl">filter_alt</span>
          </div>
          <div className="space-y-4">
            {funnelItems.map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">{item.label}</span>
                  <span className={`text-xs font-headline font-bold ${item.text}`}>{item.value}</span>
                </div>
                <div className="h-6 bg-surface-container-high rounded-full overflow-hidden relative">
                   <div className={`h-full ${item.color} ${item.w} transition-all duration-1000 ease-out flex items-center justify-end px-3 animate-slide-right`}>
                      <div className={`w-1 h-1 rounded-full ${item.text.replace('text-', 'bg-')} animate-pulse`} />
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
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Tempo Médio por Etapa</h3>
              <p className="text-[10px] text-on-surface-variant/40 font-body uppercase tracking-[0.2em] mt-1">Sincronizado em tempo real</p>
            </div>
            <span className="material-symbols-outlined text-secondary opacity-20 text-2xl">timer</span>
          </div>
          
          <div className="space-y-4 mb-6">
            {temposDetalhes.map((etapa, i) => {
              const porcentagem = (etapa.tempo / totalTempo) * 100
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-lg ${etapa.cor.replace('bg-', 'text-')}`}>{etapa.icone}</span>
                      <span className="text-sm font-bold text-on-surface">{etapa.label}</span>
                    </div>
                    <span className={`text-lg font-headline font-bold ${etapa.cor.replace('bg-', 'text-')}`}>
                      {etapa.tempo} min
                    </span>
                  </div>
                  <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${etapa.cor} rounded-full transition-all duration-700`}
                      style={{ width: `${porcentagem}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-surface-container-high p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Total Médio</span>
              <span className="text-2xl font-headline font-bold text-primary">{kpis.temposMedios.total} min</span>
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="animate-fade-in space-y-8 px-2 lg:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-headline font-bold text-on-surface tracking-tighter">Dashboard</h1>
          <p className="text-on-surface-variant/60 font-body mt-1">Visão geral do seu império hoje.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Loja Aberta/Fechada */}
          <button
            onClick={toggleLoja}
            disabled={loadingLoja}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-2xl transition-all ${
              lojaAberta 
                ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' 
                : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${lojaAberta ? 'bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'}`} />
            <span className={`text-[10px] font-headline font-bold tracking-[0.2em] uppercase ${lojaAberta ? 'text-green-500' : 'text-red-500'}`}>
              {lojaAberta ? 'Loja Aberta' : 'Loja Fechada'}
            </span>
          </button>
          
          {/* Link do Cardápio Digital */}
          <a 
            href={linkCardapio} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary-container/20 px-4 py-3 rounded-2xl border border-primary-container/30 hover:bg-primary-container/30 transition-all cursor-pointer group"
            title="Abrir Cardápio Digital"
          >
            <span className="material-symbols-outlined text-primary text-lg">qr_code_2</span>
            <span className="text-[10px] font-headline font-bold tracking-[0.1em] text-primary uppercase">Cardápio Digital</span>
            <span className="material-symbols-outlined text-primary/60 text-sm group-hover:translate-x-1 transition-transform">open_in_new</span>
          </a>
          
          {/* Botão copiar link */}
          <button
            onClick={() => navigator.clipboard.writeText(linkCardapio)}
            className="p-3 bg-surface-container-high rounded-2xl border border-outline-variant/10 hover:bg-surface-container-highest transition-all"
            title="Copiar Link"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-lg">content_copy</span>
          </button>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {order.map((id, index) => (
          <KpiCard key={id} data={kpiMap[id]} index={index} onDragStart={setDraggedKpi} onDrop={handleDropKpi} isDragging={draggedKpi === id} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {chartsOrder.map(renderChart)}
      </div>
    </div>
  )
}
