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

  // Filtros histórico
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
    // Buscar entregas da tabela entregas
    const { data: entregasData } = await supabase
      .from('entregas')
      .select('*')
      .in('status', ['atribuido', 'coletado'])
      .order('atribuido_em', { ascending: false })

    // Buscar pedidos com status 'saiu_entrega' da tabela pedidos
    const { data: pedidosSaiuEntrega } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total, motoboy_id, created_at, status')
      .eq('status', 'saiu_entrega')
      .order('created_at', { ascending: false })

    // Buscar pedidos_online com status 'saiu_entrega'
    const { data: pedidosOnlineSaiuEntrega } = await supabase
      .from('pedidos_online')
      .select('id, numero, cliente_nome, cliente_telefone, endereco, numero_endereco, bairro, total, motoboy_id, created_at, status')
      .eq('status', 'saiu_entrega')
      .order('created_at', { ascending: false })

    const todasEntregas: Entrega[] = []

    // Adicionar entregas da tabela entregas
    if (entregasData) {
      for (const e of entregasData) {
        const { data: pedido } = await supabase
          .from('pedidos')
          .select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total')
          .eq('id', e.pedido_id)
          .maybeSingle()

        const motoboy = motoboys.find(m => m.id === e.motoboy_id)

        todasEntregas.push({
          ...e,
          pedido: pedido || undefined,
          motoboy,
          fromPedido: false
        })
      }
    }

    // Adicionar pedidos com status 'saiu_entrega' que não estão na tabela entregas
    const entregasPedidoIds = new Set(entregasData?.map(e => e.pedido_id) || [])

    if (pedidosSaiuEntrega) {
      for (const p of pedidosSaiuEntrega) {
        if (!entregasPedidoIds.has(p.id)) {
          const motoboy = p.motoboy_id ? motoboys.find(m => m.id === p.motoboy_id) : undefined
          
          todasEntregas.push({
            id: p.id,
            pedido_id: p.id,
            motoboy_id: p.motoboy_id,
            status: p.motoboy_id ? 'atribuido' : 'aguardando',
            latitude_atual: null,
            longitude_atual: null,
            atribuido_em: p.created_at,
            coletado_em: null,
            entregue_em: null,
            created_at: p.created_at,
            pedido: {
              id: p.id,
              numero: p.numero,
              cliente_nome: p.cliente_nome,
              cliente_telefone: p.cliente_telefone,
              endereco_entrega: p.endereco_entrega,
              total: p.total
            },
            motoboy,
            fromPedido: true
          })
        }
      }
    }

    // Adicionar pedidos_online com status 'saiu_entrega'
    if (pedidosOnlineSaiuEntrega) {
      for (const p of pedidosOnlineSaiuEntrega) {
        if (!entregasPedidoIds.has(p.id)) {
          const motoboy = p.motoboy_id ? motoboys.find(m => m.id === p.motoboy_id) : undefined
          const endereco = [p.endereco, p.numero_endereco, p.bairro].filter(Boolean).join(', ')
          
          todasEntregas.push({
            id: p.id,
            pedido_id: p.id,
            motoboy_id: p.motoboy_id,
            status: p.motoboy_id ? 'atribuido' : 'aguardando',
            latitude_atual: null,
            longitude_atual: null,
            atribuido_em: p.created_at,
            coletado_em: null,
            entregue_em: null,
            created_at: p.created_at,
            pedido: {
              id: p.id,
              numero: p.numero,
              cliente_nome: p.cliente_nome,
              cliente_telefone: p.cliente_telefone,
              endereco_entrega: endereco,
              total: p.total
            },
            motoboy,
            fromPedido: true
          })
        }
      }
    }

    // Ordenar por data mais recente
    todasEntregas.sort((a, b) => new Date(b.atribuido_em).getTime() - new Date(a.atribuido_em).getTime())

    setEntregas(todasEntregas)
    setLoading(false)
  }, [motoboys])

  const fetchHistorico = useCallback(async () => {
    const now = new Date()
    let inicio: Date
    let fim: Date = endOfDay(now)

    switch (filtroPeriodo) {
      case 'hoje':
        inicio = startOfDay(now)
        break
      case 'semana':
        inicio = startOfWeek(now, { weekStartsOn: 1 })
        break
      case 'mes':
        inicio = startOfMonth(now)
        break
      case 'personalizado':
        inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : startOfDay(now)
        fim = dataFim ? new Date(dataFim + 'T23:59:59') : endOfDay(now)
        break
      default:
        inicio = startOfDay(now)
    }

    let query = supabase
      .from('entregas')
      .select('*')
      .gte('created_at', inicio.toISOString())
      .lte('created_at', fim.toISOString())
      .order('created_at', { ascending: false })

    if (filtroMotoboy !== 'todos') {
      query = query.eq('motoboy_id', filtroMotoboy)
    }

    const { data: entregasData } = await query

    if (entregasData) {
      const entregasCompletas = await Promise.all(
        entregasData.map(async (e) => {
          const { data: pedido } = await supabase
            .from('pedidos')
            .select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total')
            .eq('id', e.pedido_id)
            .single()

          const motoboy = motoboys.find(m => m.id === e.motoboy_id)

          return { ...e, pedido, motoboy }
        })
      )
      setEntregasHistorico(entregasCompletas as Entrega[])
    }
  }, [filtroPeriodo, filtroMotoboy, dataInicio, dataFim, motoboys])

  // Buscar entregas concluídas (pedidos com status 'entregue')
  const fetchEntregasConcluidas = useCallback(async () => {
    // Buscar entregas com status 'entregue'
    const { data: entregasData } = await supabase
      .from('entregas')
      .select('*')
      .eq('status', 'entregue')
      .order('entregue_em', { ascending: false })
      .limit(20)

    // Buscar pedidos com status 'entregue' que não estão na tabela entregas
    const { data: pedidosEntregues } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total, motoboy_id, created_at, status')
      .eq('status', 'entregue')
      .order('created_at', { ascending: false })
      .limit(20)

    // Buscar pedidos_online com status 'entregue'
    const { data: pedidosOnlineEntregues } = await supabase
      .from('pedidos_online')
      .select('id, numero, cliente_nome, cliente_telefone, endereco, numero_endereco, bairro, total, motoboy_id, created_at, status')
      .eq('status', 'entregue')
      .order('created_at', { ascending: false })
      .limit(20)

    const todasConcluidas: Entrega[] = []

    // Adicionar entregas da tabela entregas
    if (entregasData) {
      for (const e of entregasData) {
        const { data: pedido } = await supabase
          .from('pedidos')
          .select('id, numero, cliente_nome, cliente_telefone, endereco_entrega, total')
          .eq('id', e.pedido_id)
          .maybeSingle()

        const { data: pedidoOnline } = await supabase
          .from('pedidos_online')
          .select('id, numero, cliente_nome, cliente_telefone, endereco, numero_endereco, bairro, total')
          .eq('id', e.pedido_id)
          .maybeSingle()

        const pedidoInfo = pedido || pedidoOnline
        const motoboy = motoboys.find(m => m.id === e.motoboy_id)

        if (pedidoInfo) {
          const endereco = pedido ? pedido.endereco_entrega : 
            [pedidoOnline?.endereco, pedidoOnline?.numero_endereco, pedidoOnline?.bairro].filter(Boolean).join(', ')

          todasConcluidas.push({
            ...e,
            pedido: {
              id: pedidoInfo.id,
              numero: pedidoInfo.numero,
              cliente_nome: pedidoInfo.cliente_nome,
              cliente_telefone: pedidoInfo.cliente_telefone,
              endereco_entrega: endereco || '',
              total: pedidoInfo.total
            },
            motoboy,
            fromPedido: false
          })
        }
      }
    }

    // Adicionar pedidos entregues que não estão na tabela entregas
    const entregasPedidoIds = new Set(entregasData?.map(e => e.pedido_id) || [])

    if (pedidosEntregues) {
      for (const p of pedidosEntregues) {
        if (!entregasPedidoIds.has(p.id)) {
          todasConcluidas.push({
            id: p.id,
            pedido_id: p.id,
            motoboy_id: p.motoboy_id,
            status: 'entregue',
            latitude_atual: null,
            longitude_atual: null,
            atribuido_em: p.created_at,
            coletado_em: null,
            entregue_em: p.created_at,
            created_at: p.created_at,
            pedido: {
              id: p.id,
              numero: p.numero,
              cliente_nome: p.cliente_nome,
              cliente_telefone: p.cliente_telefone,
              endereco_entrega: p.endereco_entrega,
              total: p.total
            },
            fromPedido: true
          })
        }
      }
    }

    // Adicionar pedidos_online entregues
    if (pedidosOnlineEntregues) {
      for (const p of pedidosOnlineEntregues) {
        if (!entregasPedidoIds.has(p.id)) {
          const endereco = [p.endereco, p.numero_endereco, p.bairro].filter(Boolean).join(', ')
          
          todasConcluidas.push({
            id: p.id,
            pedido_id: p.id,
            motoboy_id: p.motoboy_id,
            status: 'entregue',
            latitude_atual: null,
            longitude_atual: null,
            atribuido_em: p.created_at,
            coletado_em: null,
            entregue_em: p.created_at,
            created_at: p.created_at,
            pedido: {
              id: p.id,
              numero: p.numero,
              cliente_nome: p.cliente_nome,
              cliente_telefone: p.cliente_telefone,
              endereco_entrega: endereco,
              total: p.total
            },
            fromPedido: true
          })
        }
      }
    }

    // Ordenar por data mais recente
    todasConcluidas.sort((a, b) => {
      const dateA = a.entregue_em || a.created_at
      const dateB = b.entregue_em || b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    setEntregasConcluidas(todasConcluidas.slice(0, 20))
  }, [motoboys])

  useEffect(() => {
    fetchMotoboys()
  }, [fetchMotoboys])

  useEffect(() => {
    if (motoboys.length > 0 || activeTab === 'ativas') {
      fetchEntregasAtivas()
      fetchEntregasConcluidas()
    }
  }, [motoboys, activeTab, fetchEntregasAtivas, fetchEntregasConcluidas])

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistorico()
    }
  }, [activeTab, fetchHistorico])

  // Realtime listeners
  useEffect(() => {
    const channelMotoboys = supabase
      .channel('rt-motoboys-entregas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motoboys' }, () => {
        fetchMotoboys()
      })
      .subscribe()

    const channelEntregas = supabase
      .channel('rt-entregas-ativas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => {
        fetchEntregasAtivas()
        fetchEntregasConcluidas()
        if (activeTab === 'historico') fetchHistorico()
      })
      .subscribe()

    const channelPedidos = supabase
      .channel('rt-pedidos-entregas')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, () => {
        fetchEntregasAtivas()
        fetchEntregasConcluidas()
      })
      .subscribe()

    const channelPedidosOnline = supabase
      .channel('rt-pedidos-online-entregas')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos_online' }, () => {
        fetchEntregasAtivas()
        fetchEntregasConcluidas()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channelMotoboys)
      supabase.removeChannel(channelEntregas)
      supabase.removeChannel(channelPedidos)
      supabase.removeChannel(channelPedidosOnline)
    }
  }, [fetchMotoboys, fetchEntregasAtivas, fetchEntregasConcluidas, fetchHistorico, activeTab])

  const criarMotoboy = async () => {
    if (!novoMotoboy.nome || !novoMotoboy.telefone) return
    setSalvando(true)

    await supabase.from('motoboys').insert({
      nome: novoMotoboy.nome,
      telefone: novoMotoboy.telefone,
      status: 'disponivel',
      disponivel: true,
      token_acesso: crypto.randomUUID(),
    })

    setNovoMotoboy({ nome: '', telefone: '' })
    setShowNovoMotoboy(false)
    setSalvando(false)
    fetchMotoboys()
  }

  const toggleMotoboyStatus = async (motoboy: Motoboy) => {
    const novoStatus = motoboy.status === 'inativo' ? 'disponivel' : 'inativo'
    await supabase.from('motoboys').update({ 
      status: novoStatus,
      disponivel: novoStatus === 'disponivel'
    }).eq('id', motoboy.id)
    fetchMotoboys()
  }

  const copiarLink = (token: string) => {
    const link = `${window.location.origin}/motoboy?token=${token}`
    navigator.clipboard.writeText(link)
    setCopiado(token)
    setTimeout(() => setCopiado(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'em_entrega': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'inativo': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getEntregaStatusColor = (status: string) => {
    switch (status) {
      case 'atribuido': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'coletado': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'entregue': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'cancelado': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getTempoEntrega = (entrega: Entrega) => {
    if (!entrega.entregue_em || !entrega.atribuido_em) return '---'
    const mins = differenceInMinutes(parseISO(entrega.entregue_em), parseISO(entrega.atribuido_em))
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}min`
  }

  const kpisMotoboys = {
    total: motoboys.length,
    disponiveis: motoboys.filter(m => m.status === 'disponivel').length,
    emEntrega: motoboys.filter(m => m.status === 'em_entrega').length,
    inativos: motoboys.filter(m => m.status === 'inativo').length,
  }

  const resumoHistorico = {
    totalEntregas: entregasHistorico.filter(e => e.status === 'entregue').length,
    tempoMedio: entregasHistorico.filter(e => e.status === 'entregue' && e.entregue_em).length > 0
      ? Math.round(
          entregasHistorico
            .filter(e => e.status === 'entregue' && e.entregue_em)
            .reduce((sum, e) => sum + differenceInMinutes(parseISO(e.entregue_em!), parseISO(e.atribuido_em)), 0) /
          entregasHistorico.filter(e => e.status === 'entregue' && e.entregue_em).length
        )
      : 0,
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Logística</span>
          <h2 className="text-5xl font-[Outfit] font-bold text-on-background tracking-tighter">Entregas</h2>
        </div>

        <div className="flex bg-surface-container rounded-2xl p-1 border border-outline-variant/10">
          {[
            { id: 'ativas', label: 'Ativas', icon: 'local_shipping' },
            { id: 'motoboys', label: 'Motoboys', icon: 'two_wheeler' },
            { id: 'historico', label: 'Histórico', icon: 'history' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ABA ENTREGAS ATIVAS */}
      {activeTab === 'ativas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna 1: Entregas em Andamento */}
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
              <span className="material-symbols-outlined text-primary text-lg">list_alt</span>
              Em Andamento
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                {entregas.length}
              </span>
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : entregas.length === 0 ? (
              <div className="bg-surface-container rounded-xl p-6 text-center border border-outline-variant/10">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant/30 mb-2 block">delivery_dining</span>
                <p className="text-xs text-on-surface-variant">Nenhuma entrega em andamento</p>
              </div>
            ) : (
              entregas.map(entrega => (
                <div key={entrega.id} className="bg-surface-container rounded-xl p-4 border border-outline-variant/10 hover:border-primary/20 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                        #{entrega.pedido?.numero ? String(entrega.pedido.numero).padStart(4, '0') : '---'}
                      </span>
                      <h4 className="font-bold text-sm text-on-surface">{entrega.pedido?.cliente_nome || 'Cliente'}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${getEntregaStatusColor(entrega.status)}`}>
                      {entrega.status === 'coletado' ? 'A caminho' : 'Aguardando'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span className="truncate">{entrega.pedido?.endereco_entrega || 'Sem endereço'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">person</span>
                      <span>{entrega.motoboy?.nome || 'Sem motoboy'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/10">
                    <span className="text-[9px] text-on-surface-variant">
                      {format(parseISO(entrega.atribuido_em), "HH:mm", { locale: ptBR })}
                    </span>
                    <span className="text-xs font-bold text-green-500">
                      R$ {entrega.pedido?.total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Coluna 2: Entregas Concluídas */}
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
              <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
              Concluídas
              <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-xs font-bold">
                {entregasConcluidas.length}
              </span>
            </h3>
            {entregasConcluidas.length === 0 ? (
              <div className="bg-surface-container rounded-xl p-6 text-center border border-outline-variant/10">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant/30 mb-2 block">task_alt</span>
                <p className="text-xs text-on-surface-variant">Nenhuma entrega concluída hoje</p>
              </div>
            ) : (
              entregasConcluidas.map(entrega => (
                <div key={entrega.id} className="bg-surface-container rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-green-500">
                        #{entrega.pedido?.numero ? String(entrega.pedido.numero).padStart(4, '0') : '---'}
                      </span>
                      <h4 className="font-bold text-sm text-on-surface">{entrega.pedido?.cliente_nome || 'Cliente'}</h4>
                    </div>
                    <div className="bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-green-500 text-xs">check</span>
                      <span className="text-[8px] font-bold text-green-500">OK</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">person</span>
                      <span>{entrega.motoboy?.nome || 'Motoboy'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/10">
                    <span className="text-[9px] text-on-surface-variant">
                      {entrega.entregue_em ? format(parseISO(entrega.entregue_em), "HH:mm", { locale: ptBR }) : '---'}
                    </span>
                    <span className="text-xs font-bold text-green-500">
                      R$ {entrega.pedido?.total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Coluna 3: Mapa Fixo */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4 sticky top-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-lg">map</span>
              Mapa em Tempo Real
            </h3>
            <div className="h-[calc(100vh-280px)] min-h-[400px]">
              <MapaEntregas entregasAtivas={entregas} />
            </div>
          </div>
        </div>
      )}

      {/* ABA MOTOBOYS */}
      {activeTab === 'motoboys' && (
        <div className="animate-fade-in">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Motoboys', value: kpisMotoboys.total, icon: 'two_wheeler', color: 'text-primary' },
              { label: 'Disponíveis', value: kpisMotoboys.disponiveis, icon: 'check_circle', color: 'text-green-500' },
              { label: 'Em Entrega', value: kpisMotoboys.emEntrega, icon: 'local_shipping', color: 'text-orange-500' },
              { label: 'Inativos', value: kpisMotoboys.inativos, icon: 'block', color: 'text-gray-400' },
            ].map((kpi, i) => (
              <div key={i} className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                  <span className={`material-symbols-outlined text-2xl ${kpi.color}`}>{kpi.icon}</span>
                  <span className="text-3xl font-bold font-[Outfit]">{kpi.value}</span>
                </div>
                <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{kpi.label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-on-surface">Lista de Motoboys</h3>
            <button
              onClick={() => setShowNovoMotoboy(true)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">person_add</span>
              Novo Motoboy
            </button>
          </div>

          <div className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Motoboy</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Entregas</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Avaliação</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {motoboys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-on-surface-variant italic">
                        Nenhum motoboy cadastrado
                      </td>
                    </tr>
                  ) : (
                    motoboys.map(motoboy => (
                      <tr key={motoboy.id} className="hover:bg-primary/[0.02] transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {motoboy.nome[0]}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{motoboy.nome}</div>
                              <div className="text-[10px] text-on-surface-variant">{motoboy.telefone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(motoboy.status)}`}>
                            {motoboy.status === 'disponivel' ? 'Disponível' : motoboy.status === 'em_entrega' ? 'Em Entrega' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-6 font-medium">{motoboy.total_entregas || 0}</td>
                        <td className="p-6">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span
                                key={star}
                                className={`material-symbols-outlined text-lg ${
                                  star <= Math.round(motoboy.avaliacao_media || 0)
                                    ? 'text-yellow-500'
                                    : 'text-surface-container-high'
                                }`}
                              >
                                star
                              </span>
                            ))}
                            <span className="text-xs text-on-surface-variant ml-2">
                              {(motoboy.avaliacao_media || 0).toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex gap-2">
                            <button
                              onClick={() => copiarLink(motoboy.token_acesso)}
                              className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all flex items-center gap-1"
                              title="Copiar link de acesso"
                            >
                              <span className="material-symbols-outlined text-xl">content_copy</span>
                              {copiado === motoboy.token_acesso && (
                                <span className="text-[10px] font-bold text-green-500">Copiado!</span>
                              )}
                            </button>
                            <button
                              onClick={() => toggleMotoboyStatus(motoboy)}
                              className={`p-2 rounded-lg transition-all ${
                                motoboy.status === 'inativo'
                                  ? 'hover:bg-green-500/10 text-green-500'
                                  : 'hover:bg-gray-500/10 text-gray-400'
                              }`}
                              title={motoboy.status === 'inativo' ? 'Ativar' : 'Desativar'}
                            >
                              <span className="material-symbols-outlined text-xl">
                                {motoboy.status === 'inativo' ? 'toggle_off' : 'toggle_on'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA HISTÓRICO */}
      {activeTab === 'historico' && (
        <div className="animate-fade-in">
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-2xl text-primary">local_shipping</span>
                <span className="text-3xl font-bold font-[Outfit]">{resumoHistorico.totalEntregas}</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Entregas Realizadas</span>
            </div>
            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-2xl text-secondary">timer</span>
                <span className="text-3xl font-bold font-[Outfit]">{resumoHistorico.tempoMedio} min</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Tempo Médio</span>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10 mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'semana', label: 'Esta Semana' },
                { id: 'mes', label: 'Este Mês' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setFiltroPeriodo(btn.id as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    filtroPeriodo === btn.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <select
              value={filtroMotoboy}
              onChange={e => setFiltroMotoboy(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/10 rounded-lg py-2 px-3 text-sm text-on-surface"
            >
              <option value="todos">Todos os Motoboys</option>
              {motoboys.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>

            {filtroPeriodo === 'personalizado' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant/10 rounded-lg py-2 px-3 text-sm text-on-surface"
                />
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant/10 rounded-lg py-2 px-3 text-sm text-on-surface"
                />
              </div>
            )}
          </div>

          {/* Tabela */}
          <div className="bg-surface-container rounded-3xl border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Data</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pedido</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cliente</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Motoboy</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tempo</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {entregasHistorico.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-on-surface-variant italic">
                        Nenhuma entrega no período selecionado
                      </td>
                    </tr>
                  ) : (
                    entregasHistorico.map(entrega => (
                      <tr key={entrega.id} className="hover:bg-primary/[0.02] transition-colors">
                        <td className="p-6 text-sm">
                          {format(parseISO(entrega.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="p-6 font-bold text-sm">
                          #{entrega.pedido?.numero ? String(entrega.pedido.numero).padStart(4, '0') : '---'}
                        </td>
                        <td className="p-6 text-sm">{entrega.pedido?.cliente_nome || '---'}</td>
                        <td className="p-6 text-sm">{entrega.motoboy?.nome || '---'}</td>
                        <td className="p-6 font-medium text-sm">{getTempoEntrega(entrega)}</td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getEntregaStatusColor(entrega.status)}`}>
                            {entrega.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Motoboy */}
      {showNovoMotoboy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-lg animate-fade-in" onClick={() => setShowNovoMotoboy(false)} />
          <div className="relative w-full max-w-md bg-surface-container rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/20 animate-scale-in">
            <div className="bg-surface-container-high p-8 flex items-center justify-between border-b border-outline-variant/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl font-bold">two_wheeler</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-[Outfit] tracking-tight">Novo Motoboy</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Cadastro de entregador</p>
                </div>
              </div>
              <button onClick={() => setShowNovoMotoboy(false)} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-highest rounded-full transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Nome Completo</span>
                <input
                  type="text"
                  value={novoMotoboy.nome}
                  onChange={e => setNovoMotoboy({ ...novoMotoboy, nome: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-4 px-4 mt-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: João Silva"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Telefone / WhatsApp</span>
                <input
                  type="text"
                  value={novoMotoboy.telefone}
                  onChange={e => setNovoMotoboy({ ...novoMotoboy, telefone: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-4 px-4 mt-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="(00) 00000-0000"
                />
              </label>
            </div>

            <div className="p-8 bg-surface-container-high border-t border-outline-variant/10 flex justify-end gap-4">
              <button onClick={() => setShowNovoMotoboy(false)} className="px-6 py-4 font-bold text-xs uppercase text-on-surface-variant hover:text-on-surface">
                Cancelar
              </button>
              <button
                onClick={criarMotoboy}
                disabled={salvando || !novoMotoboy.nome || !novoMotoboy.telefone}
                className="bg-primary text-white px-10 py-4 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {salvando ? 'Cadastrando...' : 'Cadastrar Motoboy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
