import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { format, differenceInMinutes, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

const playAlertSound = () => {
  const audio = new Audio('/notification.mp3')
  audio.play().catch(console.error)
}

type UnifiedPedido = {
  id: string
  numero: number
  cliente_nome: string
  cliente_telefone: string
  total: number
  tipo_tabela: 'pedidos' | 'pedidos_online'
  raw_status: string
  status_kanban: 'novo' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado'
  created_at: string
  canal: 'balcao' | 'entrega' | 'mesa' | 'app' | 'telefone' | 'ifood' | 'rappi' | 'whatsapp'
  forma_pagamento: string
  itens: any[]
  endereco_entrega?: string
  updated_at?: string
}

type MainTab = 'kanban' | 'operacional' | 'gestor'
type SubTabOperacional = 'whatsapp_ativos' | 'historico'

const MAIN_TABS = [
  { id: 'kanban', label: 'Kanban', icon: 'view_kanban' },
  { id: 'operacional', label: 'Operacional', icon: 'shopping_cart' },
  { id: 'gestor', label: 'Gestor', icon: 'smart_toy' },
] as const

const SUB_TABS_OPERACIONAL = [
  { id: 'whatsapp_ativos', label: 'WhatsApp Ativos' },
  { id: 'historico', label: 'Histórico' },
] as const

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  novo: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500' },
  em_preparo: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500' },
  preparando: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500' },
  saiu_entrega: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' },
  pronto: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' },
  entregue: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' },
  cancelado: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500' },
}

const mapKanbanStatus = (rawStatus: string): UnifiedPedido['status_kanban'] => {
  if (['aberto', 'pendente', 'confirmado'].includes(rawStatus)) return 'novo'
  if (rawStatus === 'preparando') return 'em_preparo'
  if (['pronto', 'saiu_entrega'].includes(rawStatus)) return 'saiu_entrega'
  if (rawStatus === 'entregue') return 'entregue'
  return 'cancelado'
}

const COLUMNS = [
  { id: 'novo', title: 'Novo', color: 'border-blue-500', headerBg: 'bg-blue-500/10', textColor: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
  { id: 'em_preparo', title: 'Em Preparo', color: 'border-orange-500', headerBg: 'bg-orange-500/10', textColor: 'text-orange-500', gradient: 'from-orange-500/20 to-orange-500/5' },
  { id: 'saiu_entrega', title: 'Saiu para Entrega', color: 'border-purple-500', headerBg: 'bg-purple-500/10', textColor: 'text-purple-500', gradient: 'from-purple-500/20 to-purple-500/5' },
  { id: 'entregue', title: 'Entregue', color: 'border-green-500', headerBg: 'bg-green-500/10', textColor: 'text-green-500', gradient: 'from-green-500/20 to-green-500/5' },
  { id: 'cancelado', title: 'Cancelado', color: 'border-red-500', headerBg: 'bg-red-500/10', textColor: 'text-red-500', gradient: 'from-red-500/20 to-red-500/5' },
] as const

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<UnifiedPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'kanban' | 'whatsapp' | 'gestor'>('kanban')

  const [filtroData, setFiltroData] = useState<'hoje' | 'ontem' | 'semana' | 'mes' | 'personalizado'>('hoje')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showFiltroPersonalizado, setShowFiltroPersonalizado] = useState(false)

  const [selectedPedido, setSelectedPedido] = useState<UnifiedPedido | null>(null)
  const [cancelModalPedido, setCancelModalPedido] = useState<UnifiedPedido | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  
  const [motoboyModalPedido, setMotoboyModalPedido] = useState<UnifiedPedido | null>(null)
  const [motoboysDisponiveis, setMotoboysDisponiveis] = useState<any[]>([])
  const [vinculandoMotoboy, setVinculandoMotoboy] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getDateRange = useCallback(() => {
    const now = new Date()
    let inicio: Date
    let fim: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    switch (filtroData) {
      case 'hoje':
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        break
      case 'ontem':
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0)
        fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)
        break
      case 'semana':
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0)
        break
      case 'mes':
        inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        break
      case 'personalizado':
        inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        fim = dataFim ? new Date(dataFim + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      default:
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    }

    return { inicio: inicio.toISOString(), fim: fim.toISOString() }
  }, [filtroData, dataInicio, dataFim])

  const fetchPedidos = useCallback(async () => {
    try {
      const { inicio, fim } = getDateRange()

      const { data: pdvList } = await supabase.from('pedidos').select('*, itens_pedido(*)').gte('created_at', inicio).lte('created_at', fim)
      const { data: onlineList } = await supabase.from('pedidos_online').select('*').gte('created_at', inicio).lte('created_at', fim)

      const unified: UnifiedPedido[] = []

      ;(pdvList || []).forEach((p: any) => {
        unified.push({
          id: p.id,
          numero: p.numero,
          cliente_nome: p.cliente_nome || 'Cliente Balcão',
          cliente_telefone: p.cliente_telefone || '',
          total: Number(p.total),
          tipo_tabela: 'pedidos',
          raw_status: p.status,
          status_kanban: mapKanbanStatus(p.status),
          created_at: p.created_at,
          canal: p.tipo,
          forma_pagamento: p.forma_pagamento,
          endereco_entrega: p.endereco_entrega,
          itens: p.itens_pedido?.map((ip: any) => ({
            nome: ip.produto_nome,
            qtd: ip.quantidade,
            variacao: ip.tamanho,
            obs: ip.observacoes
          })) || []
        })
      })

      ;(onlineList || []).forEach((p: any) => {
        let itensArray: any[] = []
        
        if (p.itens) {
          try {
            const parsedItens = typeof p.itens === 'string' ? JSON.parse(p.itens) : p.itens
            itensArray = Array.isArray(parsedItens) ? parsedItens.map((ip: any) => ({
              nome: ip.produto_nome || ip.nome,
              qtd: ip.quantidade || ip.qtd,
              variacao: ip.tamanho || ip.variacao,
              obs: ip.observacoes || ip.obs
            })) : []
          } catch (e) {
            console.error('Erro ao parsear itens:', e)
            itensArray = []
          }
        }
        
        unified.push({
          id: p.id,
          numero: p.numero,
          cliente_nome: p.cliente_nome,
          cliente_telefone: p.cliente_telefone,
          total: Number(p.total),
          tipo_tabela: 'pedidos_online',
          raw_status: p.status,
          status_kanban: mapKanbanStatus(p.status),
          created_at: p.created_at,
          canal: 'app',
          forma_pagamento: p.forma_pagamento,
          endereco_entrega: `${p.endereco}, ${p.numero_endereco} - ${p.bairro}`,
          itens: itensArray
        })
      })

      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setPedidos(unified)
    } catch (err) {
      console.error('Erro ao buscar pedidos', err)
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => {
    fetchPedidos()
  }, [fetchPedidos])

  useRealtime('pedidos', () => {
    playAlertSound()
    fetchPedidos()
  })
  useRealtime('pedidos_online', () => {
    playAlertSound()
    fetchPedidos()
  })

  const fetchMotoboysDisponiveis = async () => {
    const { data } = await supabase
      .from('motoboys')
      .select('*')
      .eq('status', 'disponivel')
    if (data) setMotoboysDisponiveis(data)
  }

  const vincularMotoboy = async (motoboyId: string) => {
    if (!motoboyModalPedido) return
    
    setVinculandoMotoboy(true)
    
    try {
      await supabase
        .from(motoboyModalPedido.tipo_tabela)
        .update({ status: 'saiu_entrega' })
        .eq('id', motoboyModalPedido.id)

      await supabase
        .from('entregas')
        .insert({
          pedido_id: motoboyModalPedido.id,
          motoboy_id: motoboyId,
          status: 'atribuido',
          atribuido_em: new Date().toISOString()
        })

      await supabase
        .from('motoboys')
        .update({ status: 'em_entrega' })
        .eq('id', motoboyId)

      await supabase
        .from('historico_status')
        .insert({
          pedido_id: motoboyModalPedido.id,
          origem_tabela: motoboyModalPedido.tipo_tabela,
          status_anterior: motoboyModalPedido.raw_status,
          status_novo: 'saiu_entrega'
        })

      setMotoboyModalPedido(null)
      fetchPedidos()
    } catch (err) {
      console.error('Erro ao vincular motoboy:', err)
    }
    
    setVinculandoMotoboy(false)
  }

  const handleAvançarStatus = async (pedido: UnifiedPedido) => {
    const nextStatusMap: Record<string, string> = {
      aberto: 'preparando',
      pendente: 'preparando',
      confirmado: 'preparando',
      preparando: pedido.tipo_tabela === 'pedidos_online' ? 'saiu_entrega' : 'pronto',
      pronto: 'saiu_entrega',
      saiu_entrega: 'entregue'
    }

    const nextRaw = nextStatusMap[pedido.raw_status]
    if (!nextRaw) return

    const needsMotoboy = 
      (pedido.raw_status === 'preparando' && nextRaw === 'saiu_entrega') ||
      (pedido.raw_status === 'pronto' && nextRaw === 'saiu_entrega')

    if (needsMotoboy) {
      await fetchMotoboysDisponiveis()
      setMotoboyModalPedido(pedido)
      return
    }

    try {
      const { error } = await supabase.from(pedido.tipo_tabela).update({ status: nextRaw }).eq('id', pedido.id)
      if (!error) {
        if (nextRaw === 'entregue' && pedido.cliente_telefone) {
           const { data: config } = await supabase.from('configuracoes').select('*').single()
           if (config?.fidelidade_ativa) {
               const { data: cliente } = await supabase
                 .from('clientes')
                 .select('*')
                 .eq('telefone', pedido.cliente_telefone)
                 .single()
               
               if (cliente) {
                  const novosPontos = Math.floor(pedido.total * (config.pontos_por_real || 1))
                  let novoCashback = cliente.cashback || 0
                  
                  if (config.cashback_automatico) {
                     novoCashback += novosPontos * (config.valor_ponto_reais || 0.1)
                  }

                   await supabase.from('clientes').update({
                     total_pedidos: (cliente.total_pedidos || 0) + 1,
                     total_gasto: (cliente.total_gasto || 0) + pedido.total,
                     ultimo_pedido: new Date().toISOString(),
                     pontos: (cliente.pontos || 0) + novosPontos,
                     cashback: novoCashback
                  }).eq('id', cliente.id)
               }
           }
        }

        if (nextRaw === 'entregue') {
          let motoboyId: string | null = null

          const { data: entrega } = await supabase
            .from('entregas')
            .select('motoboy_id')
            .eq('pedido_id', pedido.id)
            .maybeSingle()

          if (entrega?.motoboy_id) {
            motoboyId = entrega.motoboy_id
          } else {
            const { data: pedidoData } = await supabase
              .from(pedido.tipo_tabela)
              .select('motoboy_id')
              .eq('id', pedido.id)
              .maybeSingle()

            if (pedidoData?.motoboy_id) {
              motoboyId = pedidoData.motoboy_id
            }
          }

          if (motoboyId) {
            await supabase
              .from('motoboys')
              .update({ 
                status: 'disponivel',
                disponivel: true 
              })
              .eq('id', motoboyId)

            await supabase
              .from('entregas')
              .update({ 
                status: 'entregue',
                entregue_em: new Date().toISOString()
              })
              .eq('pedido_id', pedido.id)

            await supabase
              .from(pedido.tipo_tabela)
              .update({ motoboy_id: null })
              .eq('id', pedido.id)

            const { data: motoboy } = await supabase
              .from('motoboys')
              .select('total_entregas')
              .eq('id', motoboyId)
              .single()

            if (motoboy) {
              await supabase
                .from('motoboys')
                .update({ total_entregas: (motoboy.total_entregas || 0) + 1 })
                .eq('id', motoboyId)
            }
          }
        }

        await supabase.from('historico_status').insert({
          pedido_id: pedido.id,
          origem_tabela: pedido.tipo_tabela,
          status_anterior: pedido.raw_status,
          status_novo: nextRaw
        })
        fetchPedidos()
        
        if (selectedPedido && selectedPedido.id === pedido.id) {
           setSelectedPedido({ ...selectedPedido, raw_status: nextRaw, status_kanban: mapKanbanStatus(nextRaw) })
        }
      }
    } catch(err) { console.error(err) }
  }

  const handleCancelPedido = async () => {
    if (!cancelModalPedido || !cancelReason.trim()) return
    try {
      const { error } = await supabase.from(cancelModalPedido.tipo_tabela).update({ status: 'cancelado' }).eq('id', cancelModalPedido.id)
      if (!error) {
        await supabase.from('historico_status').insert({
          pedido_id: cancelModalPedido.id,
          origem_tabela: cancelModalPedido.tipo_tabela,
          status_anterior: cancelModalPedido.raw_status,
          status_novo: 'cancelado',
          motivo_cancelamento: cancelReason.trim()
        })
        fetchPedidos()
        setCancelModalPedido(null)
        setCancelReason('')
      }
    } catch(err) { console.error(err) }
  }

  const columnsData = useMemo(() => {
    const cols: Record<string, UnifiedPedido[]> = {
      novo: [], em_preparo: [], saiu_entrega: [], entregue: [], cancelado: []
    }
    pedidos.forEach(p => cols[p.status_kanban].push(p))
    return cols
  }, [pedidos])

  const getCanalIcon = (canal: string) => {
    switch(canal?.toLowerCase()) {
      case 'app': return 'phone_iphone'
      case 'whatsapp': return 'chat'
      case 'ifood': return 'restaurant'
      case 'rappi': return 'shopping_bag'
      case 'balcao': return 'storefront'
      case 'entrega': return 'two_wheeler'
      case 'mesa': return 'table_restaurant'
      default: return 'public'
    }
  }

  const tabs = [
    { id: 'kanban', label: 'Kanban', icon: 'view_kanban' },
  ]

  return (
    <div className="min-h-[calc(100vh-80px)] md:h-screen w-full flex flex-col px-3 sm:px-4 md:px-6 pt-12 md:pt-6 pb-4 animate-fade-in">
      {/* Header */}
      <header className="shrink-0 mb-4 md:mb-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                Pedidos
              </h1>
              <p className="text-white/50 mt-0.5 text-xs sm:text-sm">
                Kanban em tempo real — fluxo de cozinha e entrega
              </p>
            </div>
            
            {/* Resumo rápido mobile */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs">
              {COLUMNS.filter(c => c.id !== 'cancelado').map(col => (
                <div key={col.id} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${col.color.replace('border-', 'bg-')}`} />
                  <span className="text-white/40 font-medium">{columnsData[col.id]?.length || 0}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Filtros de data - scroll horizontal no mobile */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {[
              { id: 'hoje', label: 'Hoje', icon: 'today' },
              { id: 'ontem', label: 'Ontem', icon: 'history' },
              { id: 'semana', label: '7 Dias', icon: 'date_range' },
              { id: 'mes', label: 'Mês', icon: 'calendar_month' },
              { id: 'personalizado', label: 'Personalizado', icon: 'tune' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => {
                  if (btn.id === 'personalizado') {
                    setShowFiltroPersonalizado(true)
                  } else {
                    setFiltroData(btn.id as any)
                    setShowFiltroPersonalizado(false)
                  }
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  filtroData === btn.id 
                    ? 'bg-[#e8391a]/20 text-[#e8391a] border-[#e8391a]/30 shadow-lg shadow-[#e8391a]/10' 
                    : 'bg-[#16181f] border-[#252830] text-white/50 hover:bg-[#252830] hover:text-white/80'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{btn.icon}</span>
                <span className="hidden sm:inline">{btn.label}</span>
                <span className="sm:hidden">{btn.id === 'personalizado' ? 'Filtro' : btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 w-full overflow-x-auto no-scrollbar pb-2">
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 min-w-0 md:min-w-0 h-full items-stretch">
          {COLUMNS.map(col => {
            const colPedidos = columnsData[col.id] || []
            
            return (
              <div key={col.id} className="min-w-[260px] sm:min-w-[280px] md:min-w-0 flex flex-col h-full max-h-full overflow-hidden">
                {/* Column Header */}
                <div className={`shrink-0 flex justify-between items-center p-2.5 sm:p-3 lg:p-4 rounded-t-xl lg:rounded-t-2xl border-t-4 ${col.color} bg-gradient-to-r ${col.gradient} border-x border-[#252830] border-b border-[#252830]/50`}>
                  <h2 className={`font-bold text-xs sm:text-sm leading-tight ${col.textColor}`}>{col.title}</h2>
                  <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm bg-[#16181f] border ${col.color} text-white shadow-md`}>
                    {colPedidos.length}
                  </span>
                </div>
                
                {/* Column Content */}
                <div className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 p-2.5 sm:p-3 bg-[#16181f]/50 border-x border-b border-[#252830] rounded-b-xl lg:rounded-b-2xl no-scrollbar relative min-h-[250px] sm:min-h-[300px]">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-[#e8391a] animate-pulse text-sm">
                      Carregando...
                    </div>
                  ) : colPedidos.length === 0 ? (
                    <div className="text-center py-8 sm:py-10 opacity-20 text-xs sm:text-sm font-bold flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-3xl sm:text-4xl">inventory_2</span>
                      Vazio
                    </div>
                  ) : (
                    colPedidos.map(pedido => {
                      const minutesElapsed = differenceInMinutes(currentTime, parseISO(pedido.created_at))
                      let timeClass = 'text-white/50'
                      let pingTime = false
                      
                      if (minutesElapsed >= 30 && pedido.status_kanban !== 'entregue' && pedido.status_kanban !== 'cancelado') {
                        timeClass = 'text-red-500 font-bold'
                        pingTime = true
                      } else if (minutesElapsed >= 15 && pedido.status_kanban === 'novo') {
                        timeClass = 'text-yellow-400 font-bold'
                      }

                      const isCancelled = pedido.status_kanban === 'cancelado'

                      return (
                        <div key={pedido.id} className={`bg-gradient-to-br from-[#1c1e26] to-[#16181f] p-2.5 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl border ${isCancelled ? 'border-red-500/20 opacity-60' : 'border-[#252830] hover:border-[#e8391a]/30'} shadow-lg transition-all animate-fade-in group flex flex-col gap-2 relative overflow-hidden`}>
                          {/* Alerta de atraso */}
                          {pingTime && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />}

                          {/* Topo: Número + Cliente + Tempo */}
                          <div className="flex justify-between items-start gap-1.5">
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${col.textColor}`}>
                                #{String(pedido.numero).padStart(4, '0')}
                              </span>
                              <h3 className="font-bold text-xs sm:text-sm text-white leading-tight truncate" title={pedido.cliente_nome}>
                                {pedido.cliente_nome}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0 relative">
                              {pingTime && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping absolute -top-1 -right-1" />}
                              <div className={`px-1.5 py-0.5 rounded-md bg-[#252830] flex items-center gap-0.5 text-[8px] sm:text-[9px] ${timeClass}`}>
                                <span className="material-symbols-outlined text-[10px] sm:text-[12px]">schedule</span>
                                <span>{minutesElapsed}m</span>
                              </div>
                            </div>
                          </div>

                          {/* Itens do pedido */}
                          <div className="grid grid-cols-[1fr_auto] gap-1.5 p-1.5 sm:p-2 bg-[#0c0e15]/40 rounded-lg sm:rounded-xl items-center">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              {pedido.itens.slice(0, 2).map((it, i) => (
                                <p key={i} className="text-[8px] sm:text-[9px] text-white/50 truncate">
                                  <span className="font-bold text-white/60">{it.qtd}x</span> {it.nome}
                                </p>
                              ))}
                              {pedido.itens.length > 2 && (
                                <p className="text-[7px] sm:text-[8px] font-bold text-[#e8391a] opacity-60">+{pedido.itens.length - 2} mais</p>
                              )}
                            </div>
                            <div className="flex flex-col items-center gap-0.5 border-l border-[#252830]/10 pl-1.5 sm:pl-2">
                              <span className="material-symbols-outlined text-xs sm:text-sm text-white/30" title={pedido.canal}>{getCanalIcon(pedido.canal)}</span>
                              <span className="text-[6px] sm:text-[7px] uppercase font-bold tracking-widest opacity-50 whitespace-nowrap text-white/40">{pedido.forma_pagamento}</span>
                            </div>
                          </div>

                          {/* Rodapé: Total + Ações */}
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                              R$ {Number(pedido.total).toFixed(2)}
                            </span>

                            <div className="flex gap-1 sm:gap-1.5 transition-all">
                              {!isCancelled && pedido.status_kanban !== 'entregue' && (
                                <>
                                  <button onClick={() => setCancelModalPedido(pedido)} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md sm:rounded-lg bg-[#252830] hover:bg-red-500/10 hover:text-red-500 text-white/60 transition-colors" title="Cancelar">
                                    <span className="material-symbols-outlined text-[12px] sm:text-[14px]">close</span>
                                  </button>
                                  <button 
                                    onClick={() => handleAvançarStatus(pedido)}
                                    className={`h-6 sm:h-7 px-1.5 sm:px-2 flex items-center justify-center rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${col.textColor.replace('text', 'bg').replace('500', '500/20')} ${col.textColor}`}
                                    title="Avançar"
                                  >
                                    Avançar
                                  </button>
                                </>
                              )}
                              
                              <button onClick={() => setSelectedPedido(pedido)} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md sm:rounded-lg bg-[#252830] hover:bg-[#e8391a]/20 hover:text-[#e8391a] text-white/60 transition-colors" title="Ver Detalhes">
                                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">open_in_new</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal Filtro Personalizado */}
      {showFiltroPersonalizado && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowFiltroPersonalizado(false)}>
          <div className="bg-[#16181f] p-5 sm:p-6 rounded-2xl w-full max-w-md border border-[#252830] flex flex-col gap-5 sm:gap-6 animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e8391a]">date_range</span>
                Filtro Personalizado
              </h2>
              <button onClick={() => setShowFiltroPersonalizado(false)} className="w-8 h-8 rounded-full bg-[#252830] hover:bg-[#1c1e26] flex items-center justify-center text-white/60">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Data Início</label>
                <input 
                  type="date" 
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="w-full bg-[#0c0e15] rounded-xl p-3 text-sm text-white border border-[#252830] outline-none focus:border-[#e8391a]"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block">Data Fim</label>
                <input 
                  type="date" 
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full bg-[#0c0e15] rounded-xl p-3 text-sm text-white border border-[#252830] outline-none focus:border-[#e8391a]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setDataInicio('')
                  setDataFim('')
                  setShowFiltroPersonalizado(false)
                }} 
                className="flex-1 py-3 rounded-xl border border-[#252830] text-white/60 font-bold text-sm hover:bg-[#252830] transition-colors"
              >
                Limpar
              </button>
              <button 
                onClick={() => {
                  setFiltroData('personalizado')
                  setShowFiltroPersonalizado(false)
                }}
                className="flex-1 py-3 rounded-xl bg-[#e8391a] text-white font-bold text-sm hover:bg-[#c72f15] transition-all"
              >
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Pedido */}
      {cancelModalPedido && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#16181f] p-5 sm:p-6 rounded-2xl w-full max-w-sm border border-red-500/20 flex flex-col gap-4 animate-fade-in shadow-2xl">
            <h2 className="text-lg sm:text-xl font-bold text-red-500 flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              Cancelar Pedido
            </h2>
            <p className="text-sm text-white/60">
              Qual o motivo do cancelamento para o pedido #{String(cancelModalPedido.numero).padStart(4, '0')}?
            </p>
            <textarea 
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full bg-[#0c0e15] rounded-xl p-3 text-sm text-white border border-[#252830] focus:border-red-500 outline-none resize-none min-h-[100px]"
              placeholder="Diga o motivo para registro..."
            />
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => {setCancelModalPedido(null); setCancelReason('')}} className="px-4 py-2.5 rounded-xl text-white/60 hover:bg-[#252830] font-bold text-sm transition-colors">Voltar</button>
              <button onClick={handleCancelPedido} disabled={!cancelReason.trim()} className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selecionar Motoboy */}
      {motoboyModalPedido && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#16181f] p-5 sm:p-6 rounded-2xl w-full max-w-md border border-[#e8391a]/20 flex flex-col gap-4 animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e8391a]">two_wheeler</span>
                Selecionar Motoboy
              </h2>
              <button 
                onClick={() => setMotoboyModalPedido(null)} 
                className="w-8 h-8 rounded-full bg-[#252830] hover:bg-[#1c1e26] flex items-center justify-center text-white/60"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <p className="text-sm text-white/60">
              Pedido <span className="font-bold text-white">#{String(motoboyModalPedido.numero).padStart(4, '0')}</span> - {motoboyModalPedido.cliente_nome}
            </p>
            
            <div className="space-y-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
              {motoboysDisponiveis.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-white/20 mb-2 block">two_wheeler</span>
                  <p className="text-sm text-white/60">Nenhum motoboy disponível</p>
                  <p className="text-xs text-white/40 mt-1">Cadastre ou ative um motoboy na aba Entregas</p>
                </div>
              ) : (
                motoboysDisponiveis.map(motoboy => (
                  <button
                    key={motoboy.id}
                    onClick={() => vincularMotoboy(motoboy.id)}
                    disabled={vinculandoMotoboy}
                    className="w-full p-3 sm:p-4 rounded-xl border border-[#252830] hover:border-[#e8391a]/30 hover:bg-[#e8391a]/5 transition-all flex items-center gap-3 sm:gap-4 disabled:opacity-50"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <span className="text-lg sm:text-xl font-bold text-emerald-500">{motoboy.nome[0]}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-bold text-white text-sm sm:text-base truncate">{motoboy.nome}</div>
                      <div className="text-xs text-white/50">{motoboy.telefone}</div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] sm:text-xs font-bold">OK</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {vinculandoMotoboy && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-5 h-5 border-2 border-[#e8391a] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-white/60">Vinculando motoboy...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-out Detalhe do Pedido */}
      {selectedPedido && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPedido(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] md:w-[450px] bg-[#16181f] z-[100] border-l border-[#252830] shadow-2xl animate-slide-left flex flex-col">
            <div className="p-4 sm:p-6 border-b border-[#252830] flex justify-between items-center bg-[#0c0e15]/30">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Pedido #{String(selectedPedido.numero).padStart(4, '0')}</h2>
                <div className="flex gap-2 mt-2 items-center flex-wrap">
                  <span className="text-[9px] sm:text-[10px] tracking-widest uppercase bg-[#e8391a]/20 text-[#e8391a] px-2 py-0.5 rounded-md font-bold">{selectedPedido.canal}</span>
                  <span className="text-xs text-white/50">{format(parseISO(selectedPedido.created_at), "dd/MM 'às' HH:mm", {locale: ptBR})}</span>
                </div>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#252830] hover:bg-[#1c1e26] flex items-center justify-center text-white/60 transition-colors shrink-0">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 no-scrollbar">
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">person</span> Cliente
                </h3>
                <div className="bg-[#0c0e15]/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#252830]">
                  <p className="font-bold text-base sm:text-lg text-white">{selectedPedido.cliente_nome}</p>
                  <p className="text-sm text-white/50 mt-1">{selectedPedido.cliente_telefone || 'Sem telefone'}</p>
                </div>
              </section>

              {selectedPedido.endereco_entrega && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> Endereço
                  </h3>
                  <div className="bg-[#0c0e15]/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#252830] flex justify-between items-start gap-3">
                    <p className="text-sm text-white/80 leading-relaxed flex-1">{selectedPedido.endereco_entrega}</p>
                    <a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(selectedPedido.endereco_entrega)}`} className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#e8391a]/10 text-[#e8391a] hover:bg-[#e8391a]/20 transition-colors">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">map</span>
                    </a>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">restaurant_menu</span> Pedido
                </h3>
                <div className="bg-[#0c0e15]/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#252830] space-y-3">
                  {selectedPedido.itens.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start gap-3 border-b border-[#252830]/50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-white text-sm sm:text-base">{it.qtd}x {it.nome}</p>
                        {it.variacao && <p className="text-xs text-[#f57c24] mt-0.5">{it.variacao}</p>}
                        {it.obs && <p className="text-[11px] text-white/40 mt-1 italic">Obs: {it.obs}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-4 sm:p-6 border-t border-[#252830] bg-[#0c0e15]">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <span className="text-xs sm:text-sm text-white/50 uppercase tracking-widest font-bold">
                  Pagamento <br/><span className="text-white">{selectedPedido.forma_pagamento}</span>
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400">R$ {selectedPedido.total.toFixed(2)}</span>
              </div>
              {selectedPedido.status_kanban !== 'cancelado' && selectedPedido.status_kanban !== 'entregue' && (
                <button onClick={() => { handleAvançarStatus(selectedPedido) }} className="w-full h-12 sm:h-14 bg-[#e8391a] hover:bg-[#c72f15] text-white font-bold rounded-xl sm:rounded-2xl text-base sm:text-lg transition-transform active:scale-[0.98] shadow-lg shadow-[#e8391a]/30">
                  Avançar Pedido
                </button>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  )
}
