import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, differenceInMinutes, parseISO, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MapaEntregas from '../components/MapaEntregas'

interface Motoboy {
  id: string
  nome: string
  telefone: string
  status: 'disponivel' | 'em_entrega' | 'inativo'
  token_acesso: string
  avaliacao_media: number
  total_entregas: number
  created_at: string
}

interface Entrega {
  id: string
  pedido_id: string
  motoboy_id: string | null
  status: 'atribuido' | 'coletado' | 'entregue' | 'cancelado' | 'aguardando'
  latitude_atual: number | null
  longitude_atual: number | null
  atribuido_em: string
  coletado_em: string | null
  entregue_em: string | null
  created_at: string
  motoboy?: Motoboy
  pedido?: {
    id: string
    numero: number
    cliente_nome: string
    cliente_telefone: string
    endereco_entrega: string
    total: number
  }
  fromPedido?: boolean
}

export default function EntregasPage() {
  const [activeTab, setActiveTab] = useState<'ativas' | 'motoboys' | 'historico'>('ativas')
  const [motoboys, setMotoboys] = useState<Motoboy[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [entregasHistorico, setEntregasHistorico] = useState<Entrega[]>([])
  const [loading, setLoading] = useState(true)
  const [showNovoMotoboy, setShowNovoMotoboy] = useState(false)
  const [novoMotoboy, setNovoMotoboy] = useState({ nome: '', telefone: '' })
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'personalizado'>('hoje')
  const [filtroMotoboy, setFiltroMotoboy] = useState<string>('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [entregasConcluidas, setEntregasConcluidas] = useState<Entrega[]>([])

  const fetchMotoboys = useCallback(async () => {
    const { data } = await supabase.from('motoboys').select('*').order('nome')
    if (data) setMotoboys(data)
  }, [])

  const fetchEntregasAtivas = useCallback(async () => {
    const { data: entregasData } = await supabase
      .from('entregas')
      .select('*')
      .in('status', ['atribuido', 'coletado'])
      .order('atribuido_em', { ascending: false })

    const { data: pedidosSaiuEntrega } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total, motoboy_id, created_at, status')
      .eq('status', 'saiu_entrega')
      .order('created_at', { ascending: false })

    const { data: pedidosOnlineSaiuEntrega } = await supabase
      .from('pedidos_online')
      .select('id, numero, cliente_nome, cliente_telefone, endereco, numero_endereco, bairro, total, motoboy_id, created_at, status')
      .eq('status', 'saiu_entrega')
      .order('created_at', { ascending: false })

    const todasEntregas: Entrega[] = []

    if (entregasData) {
      for (const e of entregasData) {
        const { data: pedido } = await supabase
          .from('pedidos')
          .select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total')
          .eq('id', e.pedido_id)
          .maybeSingle()

        const motoboy = motoboys.find(m => m.id === e.motoboy_id)
        todasEntregas.push({ ...e, pedido: pedido || undefined, motoboy, fromPedido: false })
      }
    }

    const entregasPedidoIds = new Set(entregasData?.map(e => e.pedido_id) || [])

    if (pedidosSaiuEntrega) {
      for (const p of pedidosSaiuEntrega) {
        if (!entregasPedidoIds.has(p.id)) {
          const motoboy = p.motoboy_id ? motoboys.find(m => m.id === p.motoboy_id) : undefined
          todasEntregas.push({
            id: p.id, pedido_id: p.id, motoboy_id: p.motoboy_id,
            status: p.motoboy_id ? 'atribuido' : 'aguardando',
            latitude_atual: null, longitude_atual: null,
            atribuido_em: p.created_at, coletado_em: null, entregue_em: null, created_at: p.created_at,
            pedido: { id: p.id, numero: p.numero, cliente_nome: p.cliente_nome, cliente_telefone: p.cliente_telefone, endereco_entrega: p.endereco_entrega || '', total: p.total },
            motoboy, fromPedido: true
          })
        }
      }
    }

    if (pedidosOnlineSaiuEntrega) {
      for (const p of pedidosOnlineSaiuEntrega) {
        if (!entregasPedidoIds.has(p.id)) {
          const motoboy = p.motoboy_id ? motoboys.find(m => m.id === p.motoboy_id) : undefined
          const endereco = [p.endereco, p.numero_endereco, p.bairro].filter(Boolean).join(', ')
          todasEntregas.push({
            id: p.id, pedido_id: p.id, motoboy_id: p.motoboy_id,
            status: p.motoboy_id ? 'atribuido' : 'aguardando',
            latitude_atual: null, longitude_atual: null,
            atribuido_em: p.created_at, coletado_em: null, entregue_em: null, created_at: p.created_at,
            pedido: { id: p.id, numero: p.numero, cliente_nome: p.cliente_nome, cliente_telefone: p.cliente_telefone, endereco_entrega: endereco, total: p.total },
            motoboy, fromPedido: true
          })
        }
      }
    }

    todasEntregas.sort((a, b) => new Date(b.atribuido_em).getTime() - new Date(a.atribuido_em).getTime())
    setEntregas(todasEntregas)
    setLoading(false)
  }, [motoboys])

  const fetchHistorico = useCallback(async () => {
    const now = new Date()
    let inicio: Date
    let fim: Date = endOfDay(now)

    switch (filtroPeriodo) {
      case 'hoje': inicio = startOfDay(now); break
      case 'semana': inicio = startOfWeek(now, { weekStartsOn: 1 }); break
      case 'mes': inicio = startOfMonth(now); break
      case 'personalizado':
        inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : startOfDay(now)
        fim = dataFim ? new Date(dataFim + 'T23:59:59') : endOfDay(now)
        break
      default: inicio = startOfDay(now)
    }

    let query = supabase.from('entregas').select('*').gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString()).order('created_at', { ascending: false })
    if (filtroMotoboy !== 'todos') query = query.eq('motoboy_id', filtroMotoboy)

    const { data: entregasData } = await query
    if (entregasData) {
      const entregasCompletas = await Promise.all(
        entregasData.map(async (e) => {
          const { data: pedido } = await supabase.from('pedidos').select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total').eq('id', e.pedido_id).single()
          const motoboy = motoboys.find(m => m.id === e.motoboy_id)
          return { ...e, pedido, motoboy }
        })
      )
      setEntregasHistorico(entregasCompletas as Entrega[])
    }
  }, [filtroPeriodo, filtroMotoboy, dataInicio, dataFim, motoboys])

  const fetchEntregasConcluidas = useCallback(async () => {
    const { data: entregasData } = await supabase.from('entregas').select('*').eq('status', 'entregue').order('entregue_em', { ascending: false }).limit(20)
    const { data: pedidosEntregues } = await supabase.from('pedidos').select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total, motoboy_id, created_at, status').eq('status', 'entregue').order('created_at', { ascending: false }).limit(20)
    const { data: pedidosOnlineEntregues } = await supabase.from('pedidos_online').select('id, numero, cliente_nome, cliente_telefone, endereco, numero_endereco, bairro, total, motoboy_id, created_at, status').eq('status', 'entregue').order('created_at', { ascending: false }).limit(20)

    const todasConcluidas: Entrega[] = []
    const entregasPedidoIds = new Set(entregasData?.map(e => e.pedido_id) || [])

    if (entregasData) {
      for (const e of entregasData) {
        const { data: pedido } = await supabase.from('pedidos').select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total').eq('id', e.pedido_id).maybeSingle()
        const { data: pedidoOnline } = await supabase.from('pedidos_online').select('id, numero, cliente_nome, cliente_telefone, endereco, numero_endereco, bairro, total').eq('id', e.pedido_id).maybeSingle()
        const pedidoInfo = pedido || pedidoOnline
        const motoboy = motoboys.find(m => m.id === e.motoboy_id)
        if (pedidoInfo) {
          const endereco = pedido ? pedido.endereco_entrega : [pedidoOnline?.endereco, pedidoOnline?.numero_endereco, pedidoOnline?.bairro].filter(Boolean).join(', ')
          todasConcluidas.push({ ...e, pedido: { id: pedidoInfo.id, numero: pedidoInfo.numero, cliente_nome: pedidoInfo.cliente_nome, cliente_telefone: pedidoInfo.cliente_telefone, endereco_entrega: endereco || '', total: pedidoInfo.total }, motoboy, fromPedido: false })
        }
      }
    }

    if (pedidosEntregues) {
      for (const p of pedidosEntregues) {
        if (!entregasPedidoIds.has(p.id)) {
          todasConcluidas.push({ id: p.id, pedido_id: p.id, motoboy_id: p.motoboy_id, status: 'entregue', latitude_atual: null, longitude_atual: null, atribuido_em: p.created_at, coletado_em: null, entregue_em: p.created_at, created_at: p.created_at, pedido: { id: p.id, numero: p.numero, cliente_nome: p.cliente_nome, cliente_telefone: p.cliente_telefone, endereco_entrega: p.endereco_entrega || '', total: p.total }, fromPedido: true })
        }
      }
    }

    if (pedidosOnlineEntregues) {
      for (const p of pedidosOnlineEntregues) {
        if (!entregasPedidoIds.has(p.id)) {
          const endereco = [p.endereco, p.numero_endereco, p.bairro].filter(Boolean).join(', ')
          todasConcluidas.push({ id: p.id, pedido_id: p.id, motoboy_id: p.motoboy_id, status: 'entregue', latitude_atual: null, longitude_atual: null, atribuido_em: p.created_at, coletado_em: null, entregue_em: p.created_at, created_at: p.created_at, pedido: { id: p.id, numero: p.numero, cliente_nome: p.cliente_nome, cliente_telefone: p.cliente_telefone, endereco_entrega: endereco, total: p.total }, fromPedido: true })
        }
      }
    }

    todasConcluidas.sort((a, b) => { const dateA = a.entregue_em || a.created_at; const dateB = b.entregue_em || b.created_at; return new Date(dateB).getTime() - new Date(dateA).getTime() })
    setEntregasConcluidas(todasConcluidas.slice(0, 20))
  }, [motoboys])

  useEffect(() => { fetchMotoboys() }, [fetchMotoboys])
  useEffect(() => { if (motoboys.length > 0 || activeTab === 'ativas') { fetchEntregasAtivas(); fetchEntregasConcluidas() } }, [motoboys, activeTab, fetchEntregasAtivas, fetchEntregasConcluidas])
  useEffect(() => { if (activeTab === 'historico') fetchHistorico() }, [activeTab, fetchHistorico])

  useEffect(() => {
    const channelMotoboys = supabase.channel('rt-motoboys-entregas').on('postgres_changes', { event: '*', schema: 'public', table: 'motoboys' }, () => { fetchMotoboys() }).subscribe()
    const channelEntregas = supabase.channel('rt-entregas-ativas').on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => { fetchEntregasAtivas(); fetchEntregasConcluidas(); if (activeTab === 'historico') fetchHistorico() }).subscribe()
    const channelPedidos = supabase.channel('rt-pedidos-entregas').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, () => { fetchEntregasAtivas(); fetchEntregasConcluidas() }).subscribe()
    const channelPedidosOnline = supabase.channel('rt-pedidos-online-entregas').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos_online' }, () => { fetchEntregasAtivas(); fetchEntregasConcluidas() }).subscribe()
    return () => { supabase.removeChannel(channelMotoboys); supabase.removeChannel(channelEntregas); supabase.removeChannel(channelPedidos); supabase.removeChannel(channelPedidosOnline) }
  }, [fetchMotoboys, fetchEntregasAtivas, fetchEntregasConcluidas, fetchHistorico, activeTab])

  const criarMotoboy = async () => {
    if (!novoMotoboy.nome || !novoMotoboy.telefone) return
    setSalvando(true)
    await supabase.from('motoboys').insert({ nome: novoMotoboy.nome, telefone: novoMotoboy.telefone, status: 'disponivel', disponivel: true, token_acesso: crypto.randomUUID() })
    setNovoMotoboy({ nome: '', telefone: '' }); setShowNovoMotoboy(false); setSalvando(false); fetchMotoboys()
  }

  const toggleMotoboyStatus = async (motoboy: Motoboy) => {
    const novoStatus = motoboy.status === 'inativo' ? 'disponivel' : 'inativo'
    await supabase.from('motoboys').update({ status: novoStatus, disponivel: novoStatus === 'disponivel' }).eq('id', motoboy.id)
    fetchMotoboys()
  }

  const copiarLink = (token: string) => { const link = `${window.location.origin}/motoboy?token=${token}`; navigator.clipboard.writeText(link); setCopiado(token); setTimeout(() => setCopiado(null), 2000) }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'em_entrega': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'inativo': return 'bg-white/10 text-white/40 border-white/20'
      default: return 'bg-white/10 text-white/40 border-white/20'
    }
  }

  const getEntregaStatusColor = (status: string) => {
    switch (status) {
      case 'atribuido': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'coletado': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'entregue': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'cancelado': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-white/10 text-white/40 border-white/20'
    }
  }

  const getTempoEntrega = (entrega: Entrega) => {
    if (!entrega.entregue_em || !entrega.atribuido_em) return '---'
    const mins = differenceInMinutes(parseISO(entrega.entregue_em), parseISO(entrega.atribuido_em))
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}min`
  }

  const kpisMotoboys = { total: motoboys.length, disponiveis: motoboys.filter(m => m.status === 'disponivel').length, emEntrega: motoboys.filter(m => m.status === 'em_entrega').length, inativos: motoboys.filter(m => m.status === 'inativo').length }
  const resumoHistorico = { totalEntregas: entregasHistorico.filter(e => e.status === 'entregue').length, tempoMedio: entregasHistorico.filter(e => e.status === 'entregue' && e.entregue_em).length > 0 ? Math.round(entregasHistorico.filter(e => e.status === 'entregue' && e.entregue_em).reduce((sum, e) => sum + differenceInMinutes(parseISO(e.entregue_em!), parseISO(e.atribuido_em)), 0) / entregasHistorico.filter(e => e.status === 'entregue' && e.entregue_em).length) : 0 }

  return (
    <div className="animate-fade-in pb-10 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8">
        <div>
          <span className="text-[#f57c24] font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Logística</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">Entregas</h2>
        </div>
        <div className="flex bg-[#16181f] rounded-2xl p-1 border border-[#252830] overflow-x-auto">
          {[{ id: 'ativas', label: 'Ativas', icon: 'local_shipping' }, { id: 'motoboys', label: 'Motoboys', icon: 'two_wheeler' }, { id: 'historico', label: 'Histórico', icon: 'history' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#e8391a] text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-[#252830]'}`}>
              <span className="material-symbols-outlined text-base sm:text-lg">{tab.icon}</span><span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'ativas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2 sticky top-0 bg-[#0c0e15] py-2 z-10">
              <span className="material-symbols-outlined text-[#e8391a] text-lg">list_alt</span>Em Andamento<span className="bg-[#e8391a]/10 text-[#e8391a] px-2 py-0.5 rounded-full text-xs font-bold">{entregas.length}</span>
            </h3>
            {loading ? <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-[#e8391a] border-t-transparent rounded-full animate-spin" /></div> : entregas.length === 0 ? <div className="bg-[#16181f] rounded-xl p-6 text-center border border-[#252830]"><span className="material-symbols-outlined text-2xl text-white/20 mb-2 block">delivery_dining</span><p className="text-xs text-white/40">Nenhuma entrega em andamento</p></div> : entregas.map(entrega => (
              <div key={entrega.id} className="bg-[#16181f] rounded-xl p-4 border border-[#252830] hover:border-[#e8391a]/30 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div><span className="text-[9px] font-bold uppercase tracking-widest text-[#e8391a]">#{entrega.pedido?.numero ? String(entrega.pedido.numero).padStart(4, '0') : '---'}</span><h4 className="font-bold text-sm text-white">{entrega.pedido?.cliente_nome || 'Cliente'}</h4></div>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${getEntregaStatusColor(entrega.status)}`}>{entrega.status === 'coletado' ? 'A caminho' : 'Aguardando'}</span>
                </div>
                <div className="space-y-1 text-xs text-white/50"><div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span><span className="truncate">{entrega.pedido?.endereco_entrega || 'Sem endereço'}</span></div><div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">person</span><span>{entrega.motoboy?.nome || 'Sem motoboy'}</span></div></div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#252830]/50"><span className="text-[9px] text-white/40">{format(parseISO(entrega.atribuido_em), "HH:mm", { locale: ptBR })}</span><span className="text-xs font-bold text-emerald-400">R$ {entrega.pedido?.total?.toFixed(2) || '0.00'}</span></div>
              </div>
            ))}
          </div>
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2 sticky top-0 bg-[#0c0e15] py-2 z-10">
              <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>Concluídas<span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-bold">{entregasConcluidas.length}</span>
            </h3>
            {entregasConcluidas.length === 0 ? <div className="bg-[#16181f] rounded-xl p-6 text-center border border-[#252830]"><span className="material-symbols-outlined text-2xl text-white/20 mb-2 block">task_alt</span><p className="text-xs text-white/40">Nenhuma entrega concluída hoje</p></div> : entregasConcluidas.map(entrega => (
              <div key={entrega.id} className="bg-[#16181f] rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div><span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">#{entrega.pedido?.numero ? String(entrega.pedido.numero).padStart(4, '0') : '---'}</span><h4 className="font-bold text-sm text-white">{entrega.pedido?.cliente_nome || 'Cliente'}</h4></div>
                  <div className="bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="material-symbols-outlined text-emerald-400 text-xs">check</span><span className="text-[8px] font-bold text-emerald-400">OK</span></div>
                </div>
                <div className="space-y-1 text-xs text-white/50"><div className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">person</span><span>{entrega.motoboy?.nome || 'Motoboy'}</span></div></div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#252830]/50"><span className="text-[9px] text-white/40">{entrega.entregue_em ? format(parseISO(entrega.entregue_em), "HH:mm", { locale: ptBR }) : '---'}</span><span className="text-xs font-bold text-emerald-400">R$ {entrega.pedido?.total?.toFixed(2) || '0.00'}</span></div>
              </div>
            ))}
          </div>
          <div className="bg-[#16181f] rounded-2xl border border-[#252830] p-4 sticky top-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-[#e8391a] text-lg">map</span>Mapa em Tempo Real</h3>
            <div className="h-[calc(100vh-280px)] min-h-[400px]"><MapaEntregas entregasAtivas={entregas} /></div>
          </div>
        </div>
      )}

      {activeTab === 'motoboys' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[{ label: 'Total Motoboys', value: kpisMotoboys.total, icon: 'two_wheeler', gradient: 'from-[#e8391a]/20 to-[#e8391a]/5', border: 'border-[#e8391a]/30', text: 'text-[#e8391a]' }, { label: 'Disponíveis', value: kpisMotoboys.disponiveis, icon: 'check_circle', gradient: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400' }, { label: 'Em Entrega', value: kpisMotoboys.emEntrega, icon: 'local_shipping', gradient: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-500/30', text: 'text-orange-400' }, { label: 'Inativos', value: kpisMotoboys.inativos, icon: 'block', gradient: 'from-white/10 to-white/5', border: 'border-white/20', text: 'text-white/40' }].map((kpi, i) => (
              <div key={i} className={`bg-gradient-to-br ${kpi.gradient} rounded-2xl p-6 border ${kpi.border}`}>
                <div className="flex items-center justify-between mb-4"><span className={`material-symbols-outlined text-2xl ${kpi.text}`}>{kpi.icon}</span><span className="text-3xl font-bold text-white">{kpi.value}</span></div>
                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{kpi.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">Lista de Motoboys</h3><button onClick={() => setShowNovoMotoboy(true)} className="bg-[#e8391a] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#c72f15] transition-all shadow-lg"><span className="material-symbols-outlined">person_add</span>Novo Motoboy</button></div>
          <div className="bg-[#16181f] rounded-3xl border border-[#252830] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-[#252830] bg-[#0c0e15]/50"><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Motoboy</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Status</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Entregas</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Avaliação</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Ações</th></tr></thead>
                <tbody className="divide-y divide-[#252830]/50">
                  {motoboys.length === 0 ? <tr><td colSpan={5} className="p-20 text-center text-white/40 italic">Nenhum motoboy cadastrado</td></tr> : motoboys.map(motoboy => (
                    <tr key={motoboy.id} className="hover:bg-[#e8391a]/5 transition-colors">
                      <td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#e8391a]/10 flex items-center justify-center font-bold text-[#e8391a]">{motoboy.nome[0]}</div><div><div className="font-bold text-sm text-white">{motoboy.nome}</div><div className="text-[10px] text-white/40">{motoboy.telefone}</div></div></div></td>
                      <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(motoboy.status)}`}>{motoboy.status === 'disponivel' ? 'Disponível' : motoboy.status === 'em_entrega' ? 'Em Entrega' : 'Inativo'}</span></td>
                      <td className="p-6 font-medium text-white">{motoboy.total_entregas || 0}</td>
                      <td className="p-6"><div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map(star => <span key={star} className={`material-symbols-outlined text-lg ${star <= Math.round(motoboy.avaliacao_media || 0) ? 'text-yellow-400' : 'text-[#252830]'}`}>star</span>)}<span className="text-xs text-white/40 ml-2">{(motoboy.avaliacao_media || 0).toFixed(1)}</span></div></td>
                      <td className="p-6"><div className="flex gap-2"><button onClick={() => copiarLink(motoboy.token_acesso)} className="p-2 hover:bg-[#e8391a]/10 text-[#e8391a] rounded-lg transition-all flex items-center gap-1" title="Copiar link de acesso"><span className="material-symbols-outlined text-xl">content_copy</span>{copiado === motoboy.token_acesso && <span className="text-[10px] font-bold text-emerald-400">Copiado!</span>}</button><button onClick={() => toggleMotoboyStatus(motoboy)} className={`p-2 rounded-lg transition-all ${motoboy.status === 'inativo' ? 'hover:bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/10 text-white/40'}`} title={motoboy.status === 'inativo' ? 'Ativar' : 'Desativar'}><span className="material-symbols-outlined text-xl">{motoboy.status === 'inativo' ? 'toggle_off' : 'toggle_on'}</span></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-[#e8391a]/20 to-[#e8391a]/5 rounded-2xl p-6 border border-[#e8391a]/30"><div className="flex items-center justify-between mb-4"><span className="material-symbols-outlined text-2xl text-[#e8391a]">local_shipping</span><span className="text-3xl font-bold text-white">{resumoHistorico.totalEntregas}</span></div><span className="text-xs text-white/50 font-medium uppercase tracking-wider">Entregas Realizadas</span></div>
            <div className="bg-gradient-to-br from-[#f57c24]/20 to-[#f57c24]/5 rounded-2xl p-6 border border-[#f57c24]/30"><div className="flex items-center justify-between mb-4"><span className="material-symbols-outlined text-2xl text-[#f57c24]">timer</span><span className="text-3xl font-bold text-white">{resumoHistorico.tempoMedio} min</span></div><span className="text-xs text-white/50 font-medium uppercase tracking-wider">Tempo Médio</span></div>
          </div>
          <div className="bg-[#16181f] rounded-2xl p-4 border border-[#252830] mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">{[{ id: 'hoje', label: 'Hoje' }, { id: 'semana', label: 'Esta Semana' }, { id: 'mes', label: 'Este Mês' }, { id: 'personalizado', label: 'Personalizado' }].map(btn => <button key={btn.id} onClick={() => setFiltroPeriodo(btn.id as any)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${filtroPeriodo === btn.id ? 'bg-[#e8391a]/20 border-[#e8391a]/30 text-[#e8391a]' : 'border-[#252830] text-white/60 hover:bg-[#252830] hover:text-white'}`}>{btn.label}</button>)}</div>
            <select value={filtroMotoboy} onChange={e => setFiltroMotoboy(e.target.value)} className="bg-[#0c0e15] border border-[#252830] rounded-lg py-2 px-3 text-sm text-white"><option value="todos">Todos os Motoboys</option>{motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
            {filtroPeriodo === 'personalizado' && <div className="flex gap-2"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-[#0c0e15] border border-[#252830] rounded-lg py-2 px-3 text-sm text-white" /><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-[#0c0e15] border border-[#252830] rounded-lg py-2 px-3 text-sm text-white" /></div>}
          </div>
          <div className="bg-[#16181f] rounded-3xl border border-[#252830] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-[#252830] bg-[#0c0e15]/50"><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Data</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Pedido</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Cliente</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Motoboy</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Tempo</th><th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50">Status</th></tr></thead>
                <tbody className="divide-y divide-[#252830]/50">
                  {entregasHistorico.length === 0 ? <tr><td colSpan={6} className="p-20 text-center text-white/40 italic">Nenhuma entrega no período selecionado</td></tr> : entregasHistorico.map(entrega => (
                    <tr key={entrega.id} className="hover:bg-[#e8391a]/5 transition-colors">
                      <td className="p-6 text-sm text-white/70">{format(parseISO(entrega.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</td>
                      <td className="p-6 font-bold text-sm text-white">#{entrega.pedido?.numero ? String(entrega.pedido.numero).padStart(4, '0') : '---'}</td>
                      <td className="p-6 text-sm text-white/70">{entrega.pedido?.cliente_nome || '---'}</td>
                      <td className="p-6 text-sm text-white/70">{entrega.motoboy?.nome || '---'}</td>
                      <td className="p-6 font-medium text-sm text-white">{getTempoEntrega(entrega)}</td>
                      <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getEntregaStatusColor(entrega.status)}`}>{entrega.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showNovoMotoboy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-lg animate-fade-in" onClick={() => setShowNovoMotoboy(false)} />
          <div className="relative w-full max-w-md bg-[#16181f] rounded-3xl shadow-2xl overflow-hidden border border-[#252830] animate-scale-in">
            <div className="bg-[#0c0e15] p-8 flex items-center justify-between border-b border-[#252830]">
              <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-[#e8391a]/10 flex items-center justify-center text-[#e8391a]"><span className="material-symbols-outlined text-3xl font-bold">two_wheeler</span></div><div><h3 className="text-2xl font-bold text-white">Novo Motoboy</h3><p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Cadastro de entregador</p></div></div>
              <button onClick={() => setShowNovoMotoboy(false)} className="w-10 h-10 flex items-center justify-center hover:bg-[#252830] rounded-full transition-all text-white/60"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-8 space-y-6">
              <label className="block"><span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-1">Nome Completo</span><input type="text" value={novoMotoboy.nome} onChange={e => setNovoMotoboy({ ...novoMotoboy, nome: e.target.value })} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a]" placeholder="Ex: João Silva" /></label>
              <label className="block"><span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-1">Telefone / WhatsApp</span><input type="text" value={novoMotoboy.telefone} onChange={e => setNovoMotoboy({ ...novoMotoboy, telefone: e.target.value })} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a]" placeholder="(00) 00000-0000" /></label>
            </div>
            <div className="p-8 bg-[#0c0e15] border-t border-[#252830] flex justify-end gap-4">
              <button onClick={() => setShowNovoMotoboy(false)} className="px-6 py-4 font-bold text-xs uppercase text-white/60 hover:text-white">Cancelar</button>
              <button onClick={criarMotoboy} disabled={salvando || !novoMotoboy.nome || !novoMotoboy.telefone} className="bg-[#e8391a] text-white px-10 py-4 rounded-xl text-xs font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">{salvando ? 'Cadastrando...' : 'Cadastrar Motoboy'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
