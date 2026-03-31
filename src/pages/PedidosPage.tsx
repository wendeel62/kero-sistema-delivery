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
  { id: 'novo', title: 'Novo', color: 'border-blue-500', headerBg: 'bg-blue-500/10', textColor: 'text-blue-500' },
  { id: 'em_preparo', title: 'Em Preparo', color: 'border-orange-500', headerBg: 'bg-orange-500/10', textColor: 'text-orange-500' },
  { id: 'saiu_entrega', title: 'Saiu para Entrega', color: 'border-purple-500', headerBg: 'bg-purple-500/10', textColor: 'text-purple-500' },
  { id: 'entregue', title: 'Entregue', color: 'border-green-500', headerBg: 'bg-green-500/10', textColor: 'text-green-500' },
  { id: 'cancelado', title: 'Cancelado', color: 'border-red-500', headerBg: 'bg-red-500/10', textColor: 'text-red-500' },
] as const

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<UnifiedPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'kanban' | 'whatsapp' | 'gestor'>('kanban')

  // Filtros de data
  const [filtroData, setFiltroData] = useState<'hoje' | 'ontem' | 'semana' | 'mes' | 'personalizado'>('hoje')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showFiltroPersonalizado, setShowFiltroPersonalizado] = useState(false)

  // Drawer / Modal states
  const [selectedPedido, setSelectedPedido] = useState<UnifiedPedido | null>(null)
  const [cancelModalPedido, setCancelModalPedido] = useState<UnifiedPedido | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  
  // Modal de seleção de motoboy
  const [motoboyModalPedido, setMotoboyModalPedido] = useState<UnifiedPedido | null>(null)
  const [motoboysDisponiveis, setMotoboysDisponiveis] = useState<any[]>([])
  const [vinculandoMotoboy, setVinculandoMotoboy] = useState(false)

  // Configuração de timer global 1min para cards
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

      // PDV Mapping
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

      // Online Mapping
      ;(onlineList || []).forEach((p: any) => {
        let itensArray: any[] = []
        
        // Handle both string and array from JSONB field
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

      // Ordenar por data mais recente
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

  // Callbacks para realtime
  useRealtime('pedidos', () => {
    playAlertSound()
    fetchPedidos()
  })
  useRealtime('pedidos_online', () => {
    playAlertSound()
    fetchPedidos()
  })

  // Buscar motoboys disponíveis
  const fetchMotoboysDisponiveis = async () => {
    const { data } = await supabase
      .from('motoboys')
      .select('*')
      .eq('status', 'disponivel')
    if (data) setMotoboysDisponiveis(data)
  }

  // Vincular motoboy ao pedido
  const vincularMotoboy = async (motoboyId: string) => {
    if (!motoboyModalPedido) return
    
    setVinculandoMotoboy(true)
    
    try {
      // Atualizar status do pedido para "saiu_entrega"
      await supabase
        .from(motoboyModalPedido.tipo_tabela)
        .update({ status: 'saiu_entrega' })
        .eq('id', motoboyModalPedido.id)

      // Criar registro na tabela entregas
      await supabase
        .from('entregas')
        .insert({
          pedido_id: motoboyModalPedido.id,
          motoboy_id: motoboyId,
          status: 'atribuido',
          atribuido_em: new Date().toISOString()
        })

      // Atualizar status do motoboy para "em_entrega"
      await supabase
        .from('motoboys')
        .update({ status: 'em_entrega' })
        .eq('id', motoboyId)

      // Inserir histórico de status
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

  // Handlers baseados na arquitetura da Fase 2
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

    // Se o pedido está em "preparando" e o próximo seria "saiu_entrega", abrir modal de motoboy
    // Ou se o pedido está em "pronto" e o próximo seria "saiu_entrega"
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
        // Lógica de Fidelidade e Cashback (Módulo 2)
        if (nextRaw === 'entregue' && pedido.cliente_telefone) {
           const { data: config } = await supabase.from('configuracoes').select('*').single()
           if (config?.fidelidade_ativa) {
              // Buscar cliente
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

                  // Atualizar cliente
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

        // Se o pedido foi entregue, liberar o motoboy
        if (nextRaw === 'entregue') {
          let motoboyId: string | null = null

          // Buscar entrega vinculada ao pedido
          const { data: entrega } = await supabase
            .from('entregas')
            .select('motoboy_id')
            .eq('pedido_id', pedido.id)
            .maybeSingle()

          if (entrega?.motoboy_id) {
            motoboyId = entrega.motoboy_id
          } else {
            // Se não encontrou na tabela entregas, buscar na tabela pedidos
            const { data: pedidoData } = await supabase
              .from(pedido.tipo_tabela)
              .select('motoboy_id')
              .eq('id', pedido.id)
              .maybeSingle()

            if (pedidoData?.motoboy_id) {
              motoboyId = pedidoData.motoboy_id
            }
          }

          console.log('Liberando motoboy:', motoboyId, 'para pedido:', pedido.id)

          if (motoboyId) {
            // Atualizar status do motoboy para disponível
            const { error: motoboyError } = await supabase
              .from('motoboys')
              .update({ 
                status: 'disponivel',
                disponivel: true 
              })
              .eq('id', motoboyId)

            console.log('Motoboy liberado:', motoboyError ? 'ERRO' : 'OK', motoboyError)

            // Atualizar status da entrega se existir
            await supabase
              .from('entregas')
              .update({ 
                status: 'entregue',
                entregue_em: new Date().toISOString()
              })
              .eq('pedido_id', pedido.id)

            // Remover motoboy_id do pedido
            await supabase
              .from(pedido.tipo_tabela)
              .update({ motoboy_id: null })
              .eq('id', pedido.id)

            // Incrementar total de entregas do motoboy
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

        // Inserir histórico status silent failure
        await supabase.from('historico_status').insert({
          pedido_id: pedido.id,
          origem_tabela: pedido.tipo_tabela,
          status_anterior: pedido.raw_status,
          status_novo: nextRaw
        })
        fetchPedidos()
        
        // Atualiza a gaveta aberta, se houver
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

  // Agrupamento em colunas
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
    <div className="h-[calc(100vh-80px)] md:h-screen w-full flex flex-col p-4 md:p-8 animate-fade-in bg-background">
      {/* Header com abas e filtros */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 shrink-0">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tighter">
                {activeTab === 'kanban' ? 'Kanban de Pedidos' : activeTab === 'whatsapp' ? 'Pedidos WhatsApp' : 'Gestor Consultor'}
              </h1>
              <p className="text-on-surface-variant font-body mt-1">
                {activeTab === 'kanban' ? 'Gerenciamento em tempo real do fluxo de cozinha e entrega.' : 
                 activeTab === 'whatsapp' ? 'Acompanhe pedidos do WhatsApp em tempo real.' : 'Análise inteligente e Assistance IA.'}
              </p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 bg-surface-container/30 p-1 rounded-2xl w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary shadow-lg'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {activeTab === 'kanban' && (
          <div className="flex gap-2 flex-wrap">
             {[
               { id: 'hoje', label: 'Hoje' },
               { id: 'ontem', label: 'Ontem' },
               { id: 'semana', label: '7 Dias' },
               { id: 'mes', label: 'Este Mês' },
               { id: 'personalizado', label: 'Personalizado' },
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
                 className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                   filtroData === btn.id 
                     ? 'bg-primary-container text-primary border-primary/30' 
                     : 'bg-surface-container/50 border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high'
                 }`}
               >
                 {btn.label}
               </button>
             ))}
          </div>
        )}
      </header>

      {/* Grid unificado de 5 colunas proporcionais */}
      <div className="flex-1 w-full grid grid-cols-1 2xl:grid-cols-5 xl:grid-cols-5 lg:grid-cols-5 md:grid-cols-3 gap-4 overflow-hidden pb-4 items-stretch">
        {COLUMNS.map(col => {
          const colPedidos = columnsData[col.id] || []
          
          return (
            <div key={col.id} className="min-w-0 flex flex-col h-full max-h-full overflow-hidden">
               {/* Cabeçalho da coluna fixo */}
               <div className={`shrink-0 flex justify-between items-center p-3 2xl:p-4 rounded-t-2xl border-t-4 ${col.color} ${col.headerBg} border-x border-x-outline-variant/5 border-b border-b-outline-variant/10`}>
                 <h2 className={`font-headline font-bold text-xs 2xl:text-base xl:text-sm lg:text-[11px] leading-tight ${col.textColor}`}>{col.title}</h2>
                 <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-background border ${col.color} text-on-surface shadow-md`}>
                   {colPedidos.length}
                 </span>
               </div>
               
               {/* Scroll Independente */}
               <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-surface-container-low/30 border-x border-b border-outline-variant/5 rounded-b-2xl no-scrollbar relative min-h-[300px]">
                 {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-primary-container animate-pulse">
                      Carregando...
                    </div>
                 ) : colPedidos.length === 0 ? (
                    <div className="text-center py-10 opacity-30 text-sm font-bold flex flex-col items-center gap-2">
                       <span className="material-symbols-outlined text-4xl">inventory_2</span>
                       Vazio
                    </div>
                 ) : (
                   colPedidos.map(pedido => {
                     // Lógica visual do card requerida
                     const minutesElapsed = differenceInMinutes(currentTime, parseISO(pedido.created_at))
                     let timeClass = 'text-on-surface-variant'
                     let pingTime = false
                     
                     if (minutesElapsed >= 30 && pedido.status_kanban !== 'entregue' && pedido.status_kanban !== 'cancelado') {
                       timeClass = 'text-red-500 font-bold'
                       pingTime = true
                     } else if (minutesElapsed >= 15 && pedido.status_kanban === 'novo') {
                       timeClass = 'text-yellow-400 font-bold'
                     }

                     const isCancelled = pedido.status_kanban === 'cancelado'

                     return (
                        <div key={pedido.id} className={`bg-surface p-3 2xl:p-5 rounded-xl 2xl:rounded-2xl border ${isCancelled ? 'border-error/20 opacity-60' : 'border-outline-variant/10 hover:border-primary/30'} shadow-lg transition-all animate-fade-in group flex flex-col gap-3 2xl:gap-4 relative overflow-hidden`} >
                           
                           {/* Faixa colorida top se status atrasado (Módulo 1) */}
                           {pingTime && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />}

                           {/* Cabeçalho Card */}
                           <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                 <span className={`text-[9px] 2xl:text-[10px] font-bold uppercase tracking-widest ${col.textColor}`}>#{String(pedido.numero).padStart(4, '0')}</span>
                                 <h3 className="font-headline font-bold text-xs xl:text-sm 2xl:text-lg text-on-surface leading-tight truncate" title={pedido.cliente_nome}>
                                   {pedido.cliente_nome}
                                 </h3>
                              </div>
                              
                              <div className="flex items-center gap-1.5 shrink-0">
                                {pingTime && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping absolute top-4 right-12" />}
                                <div className={`px-1.5 py-0.5 rounded-lg bg-surface-container flex items-center gap-1 text-[9px] 2xl:text-xs ${timeClass}`}>
                                   <span className="material-symbols-outlined text-[12px] 2xl:text-[14px]">schedule</span>
                                   <span>{minutesElapsed}m</span>
                                </div>
                              </div>
                           </div>

                           {/* Info secundária (Items resumos e canal) */}
                           <div className="grid grid-cols-[1fr_auto] gap-1.5 p-2 2xl:p-3 bg-surface-container/40 rounded-xl items-center">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                 {pedido.itens.slice(0, 2).map((it, i) => (
                                    <p key={i} className="text-[9px] 2xl:text-xs text-on-surface-variant truncate">
                                       <span className="font-bold text-on-surface/60">{it.qtd}x</span> {it.nome}
                                    </p>
                                 ))}
                                 {pedido.itens.length > 2 && (
                                    <p className="text-[8px] 2xl:text-[10px] font-bold text-primary opacity-60">+{pedido.itens.length - 2} mais</p>
                                 )}
                              </div>
                              <div className="flex flex-col items-center gap-1 border-l border-outline-variant/10 pl-2">
                                 <span className="material-symbols-outlined text-sm text-on-surface-variant/40" title={pedido.canal}>{getCanalIcon(pedido.canal)}</span>
                                 <span className="text-[7px] 2xl:text-[9px] uppercase font-bold tracking-widest opacity-50 whitespace-nowrap">{pedido.forma_pagamento}</span>
                              </div>
                           </div>

                           {/* Footer Card (Botoes e Total) */}
                           <div className="flex justify-between items-center mt-1">
                             <span className="text-green-400 font-headline font-bold text-xs xl:text-sm 2xl:text-lg">
                               R$ {Number(pedido.total).toFixed(2)}
                             </span>

                             <div className="flex gap-1.5 transition-all">
                               {!isCancelled && pedido.status_kanban !== 'entregue' && (
                                 <>
                                   <button onClick={() => setCancelModalPedido(pedido)} className="w-7 h-7 2xl:w-9 2xl:h-9 flex items-center justify-center rounded-lg 2xl:rounded-xl bg-surface-container hover:bg-error/10 hover:text-error text-on-surface-variant transition-colors" title="Cancelar">
                                     <span className="material-symbols-outlined text-[14px] 2xl:text-[18px]">close</span>
                                   </button>
                                   <button 
                                     onClick={() => handleAvançarStatus(pedido)}
                                     className={`h-7 2xl:h-9 px-2 2xl:px-4 flex items-center justify-center rounded-lg 2xl:rounded-xl text-[10px] 2xl:text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${col.textColor.replace('text', 'bg').replace('500', '500/10')} ${col.textColor}`}
                                     title="Avançar"
                                   >
                                     Avançar
                                   </button>
                                 </>
                               )}
                               
                               <button onClick={() => setSelectedPedido(pedido)} className="w-7 h-7 2xl:w-9 2xl:h-9 flex items-center justify-center rounded-lg 2xl:rounded-xl bg-surface-container hover:bg-primary-container hover:text-primary transition-colors" title="Ver Detalhes">
                                 <span className="material-symbols-outlined text-[14px] 2xl:text-[18px]">open_in_new</span>
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

      {/* Modal Filtro Personalizado */}
      {showFiltroPersonalizado && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowFiltroPersonalizado(false)}>
          <div className="bg-surface p-6 rounded-3xl w-full max-w-md border border-outline-variant/20 flex flex-col gap-6 animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">date_range</span>
                Filtro Personalizado
              </h2>
              <button onClick={() => setShowFiltroPersonalizado(false)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Data Início</label>
                <input 
                  type="date" 
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="w-full bg-surface-container rounded-xl p-3 text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Data Fim</label>
                <input 
                  type="date" 
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full bg-surface-container rounded-xl p-3 text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary"
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
                className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm transition-colors hover:bg-surface-container"
              >
                Limpar
              </button>
              <button 
                onClick={() => {
                  setFiltroData('personalizado')
                  setShowFiltroPersonalizado(false)
                }}
                className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm transition-all hover:bg-primary/90"
              >
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelamento */}
      {cancelModalPedido && (
         <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
           <div className="bg-surface p-6 rounded-3xl w-full max-w-sm border border-error/20 flex flex-col gap-4 animate-fade-in shadow-2xl">
              <h2 className="text-xl font-headline font-bold text-error flex items-center gap-2">
                 <span className="material-symbols-outlined">warning</span>
                 Cancelar Pedido
              </h2>
              <p className="text-sm text-on-surface-variant">
                 Qual o motivo do cancelamento para o pedido #{String(cancelModalPedido.numero).padStart(4, '0')}?
              </p>
              <textarea 
                 value={cancelReason}
                 onChange={e => setCancelReason(e.target.value)}
                 className="w-full bg-surface-container rounded-xl p-3 text-sm text-on-surface border border-outline-variant/10 focus:border-error outline-none resize-none min-h-[100px]"
                 placeholder="Diga o motivo para registro..."
              />
              <div className="flex justify-end gap-3 mt-2">
                 <button onClick={() => {setCancelModalPedido(null); setCancelReason('')}} className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container font-bold text-sm transition-colors">Voltar</button>
                 <button onClick={handleCancelPedido} disabled={!cancelReason.trim()} className="px-4 py-2 rounded-xl bg-error hover:bg-error/80 text-on-error font-bold text-sm transition-colors disabled:opacity-50">Confirmar</button>
              </div>
           </div>
         </div>
      )}

      {/* Modal Seleção de Motoboy */}
      {motoboyModalPedido && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface p-6 rounded-3xl w-full max-w-md border border-primary/20 flex flex-col gap-4 animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">two_wheeler</span>
                Selecionar Motoboy
              </h2>
              <button 
                onClick={() => setMotoboyModalPedido(null)} 
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <p className="text-sm text-on-surface-variant">
              Pedido <span className="font-bold text-on-surface">#{String(motoboyModalPedido.numero).padStart(4, '0')}</span> - {motoboyModalPedido.cliente_nome}
            </p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {motoboysDisponiveis.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">two_wheeler</span>
                  <p className="text-sm text-on-surface-variant">Nenhum motoboy disponível</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1">Cadastre ou ative um motoboy na aba Entregas</p>
                </div>
              ) : (
                motoboysDisponiveis.map(motoboy => (
                  <button
                    key={motoboy.id}
                    onClick={() => vincularMotoboy(motoboy.id)}
                    disabled={vinculandoMotoboy}
                    className="w-full p-4 rounded-xl border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-4 disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-green-500">{motoboy.nome[0]}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-on-surface">{motoboy.nome}</div>
                      <div className="text-xs text-on-surface-variant">{motoboy.telefone}</div>
                    </div>
                    <div className="flex items-center gap-1 text-green-500">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-bold">Disponível</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {vinculandoMotoboy && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-on-surface-variant">Vinculando motoboy...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer Detalhes */}
      {selectedPedido && (
         <>
           <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPedido(null)} />
           <div className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-surface z-[100] border-l border-outline-variant/10 shadow-2xl animate-slide-left flex flex-col">
              <div className="p-6 border-b border-outline-variant/5 flex justify-between items-center bg-surface-container-low/30">
                 <div>
                   <h2 className="text-2xl font-headline font-bold text-on-surface">Pedido #{String(selectedPedido.numero).padStart(4, '0')}</h2>
                   <div className="flex gap-2 mt-1 items-center">
                     <span className="text-[10px] tracking-widest uppercase bg-primary-container text-primary px-2 py-0.5 rounded-md font-bold">{selectedPedido.canal}</span>
                     <span className="text-xs text-on-surface-variant">{format(parseISO(selectedPedido.created_at), "dd/MM 'às' HH:mm", {locale: ptBR})}</span>
                   </div>
                 </div>
                 <button onClick={() => setSelectedPedido(null)} className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                 {/* Cliente */}
                 <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[16px]">person</span> Cliente
                    </h3>
                    <div className="bg-surface-container/30 p-4 rounded-2xl border border-outline-variant/5">
                       <p className="font-headline font-bold text-lg text-on-surface">{selectedPedido.cliente_nome}</p>
                       <p className="text-sm text-on-surface-variant mt-1">{selectedPedido.cliente_telefone || 'Sem telefone'}</p>
                    </div>
                 </section>

                 {/* Endereço */}
                 {selectedPedido.endereco_entrega && (
                    <section className="space-y-3">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">location_on</span> Endereço
                       </h3>
                       <div className="bg-surface-container/30 p-4 rounded-2xl border border-outline-variant/5 flex justify-between items-start gap-4">
                          <p className="text-sm text-on-surface leading-relaxed">{selectedPedido.endereco_entrega}</p>
                          <a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(selectedPedido.endereco_entrega)}`} className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                             <span className="material-symbols-outlined text-[20px]">map</span>
                          </a>
                       </div>
                    </section>
                 )}

                 {/* Itens */}
                 <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[16px]">restaurant_menu</span> Pedido
                    </h3>
                    <div className="bg-surface-container/30 p-4 rounded-2xl border border-outline-variant/5 space-y-3">
                       {selectedPedido.itens.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between items-start gap-3 border-b border-outline-variant/5 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                             <div>
                               <p className="font-bold text-on-surface">{it.qtd}x {it.nome}</p>
                               {it.variacao && <p className="text-xs text-secondary mt-0.5">{it.variacao}</p>}
                               {it.obs && <p className="text-[11px] text-on-surface-variant/60 mt-1 italic">Obs: {it.obs}</p>}
                             </div>
                          </div>
                       ))}
                    </div>
                 </section>
              </div>

              {/* Fixado Embaixo */}
              <div className="p-6 border-t border-outline-variant/10 bg-surface">
                 <div className="flex justify-between items-center mb-6">
                    <span className="text-sm text-on-surface-variant uppercase tracking-widest font-bold">Pagamento <br/><span className="text-on-surface">{selectedPedido.forma_pagamento}</span></span>
                    <span className="text-3xl font-headline font-bold text-green-400">R$ {selectedPedido.total.toFixed(2)}</span>
                 </div>
                 {selectedPedido.status_kanban !== 'cancelado' && selectedPedido.status_kanban !== 'entregue' && (
                    <button onClick={() => { handleAvançarStatus(selectedPedido) }} className="w-full h-14 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-2xl text-lg transition-transform active:scale-[0.98] shadow-[0_0_20px_rgba(255,86,55,0.3)]">
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
