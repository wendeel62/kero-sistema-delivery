import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { useToast } from '../contexts/ToastContext'
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
  mesa_numero?: number
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
  novo: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary' },
  em_preparo: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary' },
  preparando: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary' },
  saiu_entrega: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' },
  pronto: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' },
  entregue: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' },
  cancelado: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500' },
}

const mapKanbanStatus = (rawStatus: string): UnifiedPedido['status_kanban'] => {
  if (['aberto', 'pendente', 'confirmado', 'em_preparo'].includes(rawStatus)) return 'novo'
  if (rawStatus === 'preparando') return 'em_preparo'
  if (['pronto', 'saiu_entrega'].includes(rawStatus)) return 'saiu_entrega'
  if (rawStatus === 'entregue') return 'entregue'
  return 'cancelado'
}

const COLUMNS = [
  { id: 'novo', title: 'Novo', color: '#3b82f6', textColor: 'text-[#3b82f6]' },
  { id: 'em_preparo', title: 'Em Preparo', color: '#f59e0b', textColor: 'text-[#f59e0b]' },
  { id: 'saiu_entrega', title: 'Saiu para Entrega', color: '#8b5cf6', textColor: 'text-[#8b5cf6]' },
  { id: 'entregue', title: 'Entregue', color: '#22c55e', textColor: 'text-[#22c55e]' },
  { id: 'cancelado', title: 'Cancelado', color: '#ef4444', textColor: 'text-[#ef4444]' },
] as const

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

export default function PedidosPage() {
  const { user } = useAuth()
  // Fallback para tenant_id do usuário logado ou do tenant_id do primeiro pedido
  const tenantId = user?.user_metadata?.tenant_id || getTenantId() || '19f48a0b-3117-4d2b-856e-41673dc43275'
  const queryClient = useQueryClient()
  const toast = useToast()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'kanban' | 'whatsapp' | 'gestor'>('kanban')
  const [activeColIndex, setActiveColIndex] = useState(0)
  const kanbanRef = useRef<HTMLDivElement>(null)

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
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

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

  const { data: pedidos = [] as UnifiedPedido[], isLoading: loading, refetch: refetchPedidos } = useQuery({
    queryKey: ['pedidos', tenantId, filtroData, dataInicio, dataFim],
    queryFn: async () => {
      const { inicio, fim } = getDateRange()

      const { data: pdvList } = await supabase.from('pedidos').select('*, itens_pedido(*)').eq('tenant_id', tenantId).gte('created_at', inicio).lte('created_at', fim)
      const { data: onlineList } = await supabase.from('pedidos_online').select('*').eq('tenant_id', tenantId).gte('created_at', inicio).lte('created_at', fim)

      const unified: UnifiedPedido[] = []

      ;(pdvList || []).forEach((p: any) => {
        unified.push({
          id: p.id,
          numero: p.numero,
          cliente_nome: p.cliente_nome || (p.tipo === 'mesa' ? `Mesa ${p.mesa_numero}` : 'Cliente Balcão'),
          cliente_telefone: p.cliente_telefone || '',
          total: Number(p.total),
          tipo_tabela: 'pedidos',
          raw_status: p.status,
          status_kanban: mapKanbanStatus(p.status),
          created_at: p.created_at,
          canal: p.tipo,
          forma_pagamento: p.forma_pagamento,
          endereco_entrega: p.endereco_entrega,
          mesa_numero: p.mesa_numero,
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
      
      return unified
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  useRealtime({
    configs: [
      { 
        table: 'pedidos', 
        filter: `tenant_id=eq.${tenantId}`, 
        callback: () => {
          playAlertSound()
          queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
        } 
      },
      { 
        table: 'pedidos_online', 
        filter: `tenant_id=eq.${tenantId}`, 
        callback: () => {
          playAlertSound()
          queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
        } 
      }
    ]
  })

  const fetchMotoboysDisponiveis = async () => {
    const { data } = await supabase
      .from('motoboys')
      .select('*')
      .eq('disponivel', true)
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
        .update({ status: 'em_entrega', disponivel: false })
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
      refetchPedidos()
    } catch (err) {
      console.error('Erro ao vincular motoboy:', err)
    }
    
    setVinculandoMotoboy(false)
  }

  const handleAvançarStatus = async (pedido: UnifiedPedido) => {
    // Para balcao e mesa: pular "saiu_entrega" (NOVO → EM PREPARO → ENTREGUE)
    // Para entrega: fluxo completo com motoboy
    const isDelivery = pedido.canal === 'entrega' || pedido.canal === 'app' || pedido.canal === 'ifood' || pedido.canal === 'rappi' || pedido.canal === 'whatsapp'
    
    const nextStatusMap: Record<string, string> = isDelivery ? {
      aberto: 'preparando',
      pendente: 'preparando',
      confirmado: 'preparando',
      preparando: 'saiu_entrega',
      pronto: 'saiu_entrega',
      saiu_entrega: 'entregue'
    } : {
      // balcao e mesa: pula "saiu_entrega"
      aberto: 'preparando',
      pendente: 'preparando',
      confirmado: 'preparando',
      preparando: 'entregue',  // vai direto para entregue
      pronto: 'entregue',
      saiu_entrega: 'entregue'
    }

    const nextRaw = nextStatusMap[pedido.raw_status]
    if (!nextRaw) return

    // Abrir modal de motoboy APENAS para pedidos de entrega ao sair de EM PREPARO
    const needsMotoboy = isDelivery && pedido.raw_status === 'preparando'

    if (needsMotoboy) {
      await fetchMotoboysDisponiveis()
      setMotoboyModalPedido(pedido)
      return
    }

    try {
      const { error } = await supabase.from(pedido.tipo_tabela).update({ status: nextRaw }).eq('id', pedido.id).eq('tenant_id', tenantId)
      if (!error) {
        if (nextRaw === 'preparando') {
          try {
            const { data: debitResult } = await supabase.functions.invoke('debitar-estoque', {
              body: { pedido_id: pedido.id, tenant_id: tenantId }
            })
            if (debitResult?.alertas?.length > 0) {
              console.warn('Alertas de estoque:', debitResult.alertas)
            }
          } catch (debitErr) {
            console.error('Erro ao debitar estoque:', debitErr)
          }
        }
        if (nextRaw === 'entregue' && pedido.cliente_telefone) {
           const { data: config } = await supabase.from('configuracoes').select('*').eq('tenant_id', tenantId).single()
           if (config?.fidelidade_ativa) {
               const { data: cliente } = await supabase
                 .from('clientes')
                 .select('*')
                 .eq('telefone', pedido.cliente_telefone)
                 .eq('tenant_id', tenantId)
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
                  }).eq('id', cliente.id).eq('tenant_id', tenantId)
               }
           }
        }

        if (nextRaw === 'entregue') {
          let motoboyId: string | null = null

          const { data: entrega } = await supabase
            .from('entregas')
            .select('motoboy_id')
            .eq('pedido_id', pedido.id)
            .eq('tenant_id', tenantId)
            .maybeSingle()

          if (entrega?.motoboy_id) {
            motoboyId = entrega.motoboy_id
          } else {
            const { data: pedidoData } = await supabase
              .from(pedido.tipo_tabela)
              .select('motoboy_id')
              .eq('id', pedido.id)
              .eq('tenant_id', tenantId)
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
              .eq('tenant_id', tenantId)

            await supabase
              .from('entregas')
              .update({ 
                status: 'entregue',
                entregue_em: new Date().toISOString()
              })
              .eq('pedido_id', pedido.id)
              .eq('tenant_id', tenantId)

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
          tenant_id: tenantId,
          pedido_id: pedido.id,
          origem_tabela: pedido.tipo_tabela,
          status_anterior: pedido.raw_status,
          status_novo: nextRaw
        })
        refetchPedidos()
        
        if (selectedPedido && selectedPedido.id === pedido.id) {
           setSelectedPedido({ ...selectedPedido, raw_status: nextRaw, status_kanban: mapKanbanStatus(nextRaw) })
        }
      }
    } catch(err) { console.error(err) }
  }

  const { mutate: cancelarPedido, isPending: cancelando } = useMutation({
    mutationFn: async ({ pedido, motivo }: { pedido: UnifiedPedido, motivo: string }) => {
      const { error } = await supabase.from(pedido.tipo_tabela).update({ status: 'cancelado' }).eq('id', pedido.id).eq('tenant_id', tenantId)
      if (error) throw error
      await supabase.from('historico_status').insert({
        tenant_id: tenantId,
        pedido_id: pedido.id,
        origem_tabela: pedido.tipo_tabela,
        status_anterior: pedido.raw_status,
        status_novo: 'cancelado',
        motivo_cancelamento: motivo
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
      toast.success('Pedido cancelado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao cancelar pedido')
    }
  })

  const { mutate: mudarStatus, isPending: mudandoStatus } = useMutation({
    mutationFn: async ({ pedidoId, novaTabela, novoStatus }: { pedidoId: string, novaTabela: string, novoStatus: string }) => {
      const { error } = await supabase.from(novaTabela).update({ status: novoStatus }).eq('id', pedidoId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
      toast.success('Status atualizado')
    },
    onError: () => {
      toast.error('Erro ao atualizar status')
    }
  })

  const handleCancelPedido = () => {
    if (!cancelModalPedido || !cancelReason.trim()) return
    cancelarPedido({ pedido: cancelModalPedido, motivo: cancelReason.trim() })
    setCancelModalPedido(null)
    setCancelReason('')
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

  const scrollToColumn = (index: number) => {
    setActiveColIndex(index)
    if (kanbanRef.current) {
      const colWidth = kanbanRef.current.scrollWidth / COLUMNS.length
      kanbanRef.current.scrollTo({
        left: index * colWidth,
        behavior: 'smooth'
      })
    }
  }

  const handleScroll = () => {
    if (kanbanRef.current) {
      const scrollLeft = kanbanRef.current.scrollLeft
      const colWidth = kanbanRef.current.offsetWidth // Use offsetWidth for viewport width
      const index = Math.min(Math.floor((scrollLeft + colWidth/2) / colWidth), COLUMNS.length - 1)
      if (index !== activeColIndex) {
        setActiveColIndex(index)
      }
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 lg:px-8 space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="shrink-0 animate-slide-in-down">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold font-headline text-on-background tracking-tight">
                Pedidos
              </h1>
              <p className="text-on-surface-variant mt-1 text-lg">
                Kanban em tempo real — fluxo de cozinha e entrega
              </p>
            </div>
            
            {/* Resumo rápido mobile — Agora clicável como abas */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {COLUMNS.map((col, idx) => (
                <button 
                  key={col.id} 
                  onClick={() => scrollToColumn(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 hover:scale-105 active:scale-95 ${
                    activeColIndex === idx 
                      ? `${col.color} bg-surface-container shadow-lg shadow-primary/10` 
                      : 'border-transparent bg-surface-container/40 opacity-40 hover:opacity-70'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${col.color.replace('border-', 'bg-')}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeColIndex === idx ? 'text-on-background' : 'text-on-surface-variant'}`}>
                    {col.title.split(' ')[0]}
                  </span>
                  <span className={`text-[10px] font-bold ${activeColIndex === idx ? col.textColor : 'text-on-surface-variant'}`}>
                    {columnsData[col.id]?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Filtros de data - scroll horizontal no mobile */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 animate-slide-in-up">
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
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border hover:scale-105 active:scale-95 ${
                  filtroData === btn.id 
                    ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/10' 
                    : 'bg-surface-container border-outline text-on-surface-variant hover:bg-surface-container-high hover:text-on-background'
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
      <div 
        ref={kanbanRef}
        onScroll={handleScroll}
        className="flex w-full gap-2 h-full pb-4 overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        <div className="flex gap-2 w-full">
        {COLUMNS.map((col, idx) => {
          const colPedidos = columnsData[col.id] || []
          
          return (
            <div 
              key={col.id} 
              className="flex-none w-[85vw] sm:w-[300px] md:flex-1 md:min-w-0 flex flex-col snap-start"
            >
              {/* Column Header */}
              <div className="bg-[#16181f] rounded-t-xl p-3">
                {/* Barra colorida fina no topo */}
                <div 
                  className="h-1 rounded-t-xl mb-2" 
                  style={{ backgroundColor: col.color }}
                />
                <div className="flex justify-between items-center">
                  <h2 className={`${col.textColor} text-sm font-semibold uppercase tracking-wider`}>
                    {col.title}
                  </h2>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: col.color }}
                  >
                    {colPedidos.length}
                  </span>
                </div>
              </div>
              
              {/* Column Content */}
              <div className="bg-[#0f1117] rounded-b-xl p-2 flex flex-col gap-2 flex-1 overflow-y-auto min-h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center text-[#e8391a] animate-pulse text-sm py-8">
                    Carregando...
                  </div>
                ) : colPedidos.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-sm flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                    Vazio
                  </div>
                ) : (
                  colPedidos.map(pedido => {
                    const minutesElapsed = differenceInMinutes(currentTime, parseISO(pedido.created_at))
                    const isCancelled = pedido.status_kanban === 'cancelado'

                    // Formatar forma de pagamento
                    const formaPagto = pedido.forma_pagamento?.toUpperCase() || 'DINHEIRO'
                    const formaLabel = formaPagto === 'CARTAO_CREDITO' ? 'Cartão Crédito' :
                                    formaPagto === 'CARTAO_DEBITO' ? 'Cartão Débito' :
                                    formaPagto === 'PIX' ? 'PIX' : 'Dinheiro'

                    return (
                      <div 
                        key={pedido.id} 
                        className="bg-[#16181f] border border-[#252830] rounded-xl p-3 hover:border-[#353840] transition-all flex flex-col gap-2"
                        onClick={() => {
                          console.log('Clicou card:', pedido.id, expandedCard)
                          setExpandedCard(pedido.id)
                        }}
                      >
                        {/* LINHA 1 — header do card: Número + Tempo */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#e8391a]">
                            #{String(pedido.numero).padStart(4, '0')}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            <span>{minutesElapsed}m</span>
                          </div>
                        </div>

                        {/* LINHA 2 — nome do cliente */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-[#dde0ee]">
                            {pedido.cliente_nome}
                          </h3>
                          {pedido.canal === 'mesa' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b] text-black">
                              MESA {pedido.mesa_numero}
                            </span>
                          )}
                          {(pedido.forma_pagamento?.includes('cartao') || pedido.forma_pagamento?.toUpperCase() === 'PIX') && pedido.status_kanban === 'entregue' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500 text-white">
                              PAGO
                            </span>
                          )}
                        </div>

                        {/* LINHA 3 — itens */}
                        <div className="flex flex-col gap-0.5">
                          {pedido.itens.map((it, i) => (
                            <p key={i} className="text-xs text-gray-400">
                              {it.qtd}x {it.nome}
                            </p>
                          ))}
                          {pedido.itens.length === 0 && (
                            <p className="text-xs text-gray-500">Sem itens</p>
                          )}
                        </div>

                        {/* LINHA 4 — forma de pagamento */}
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="material-symbols-outlined text-xs">payments</span>
                          <span>{formaLabel}</span>
                        </div>

                        {/* LINHA 5 — footer: Valor + Botões */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#e8391a]">
                            R$ {Number(pedido.total).toFixed(2)}
                          </span>
                          <div className="flex gap-2">
                            {!isCancelled && pedido.status_kanban !== 'entregue' && (
                              <>
                                <button onClick={() => setCancelModalPedido(pedido)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20" title="Cancelar">
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                                <button 
                                  onClick={() => handleAvançarStatus(pedido)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#e8391a] text-white hover:scale-105 transition-transform"
                                  title="Avançar"
                                >
                                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                              </>
                            )}
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
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFiltroPersonalizado(false)}>
          <div className="bg-surface-container p-5 sm:p-6 rounded-2xl w-full max-w-md border border-outline flex flex-col gap-5 sm:gap-6 animate-fade-in-up shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">date_range</span>
                Filtro Personalizado
              </h2>
              <button onClick={() => setShowFiltroPersonalizado(false)} className="w-8 h-8 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
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
                  className="w-full bg-surface-dim rounded-xl p-3 text-sm text-on-background border border-outline outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Data Fim</label>
                <input 
                  type="date" 
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full bg-surface-dim rounded-xl p-3 text-sm text-on-background border border-outline outline-none focus:border-primary"
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
                className="flex-1 py-3 rounded-xl border border-outline text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                Limpar
              </button>
              <button 
                onClick={() => {
                  setFiltroData('personalizado')
                  setShowFiltroPersonalizado(false)
                }}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-bright text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
              >
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Pedido */}
      {cancelModalPedido && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-5 sm:p-6 rounded-2xl w-full max-w-sm border border-red-500/20 flex flex-col gap-4 animate-fade-in-up shadow-2xl">
            <h2 className="text-lg sm:text-xl font-bold text-red-500 flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              Cancelar Pedido
            </h2>
            <p className="text-sm text-on-surface-variant">
              Qual o motivo do cancelamento para o pedido #{String(cancelModalPedido.numero).padStart(4, '0')}?
            </p>
            <textarea 
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full bg-surface-dim rounded-xl p-3 text-sm text-on-background border border-outline focus:border-red-500 outline-none resize-none min-h-[100px]"
              placeholder="Diga o motivo para registro..."
            />
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => {setCancelModalPedido(null); setCancelReason('')}} className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high font-bold text-sm transition-colors">Voltar</button>
              <button onClick={handleCancelPedido} disabled={!cancelReason.trim()} className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 hover:scale-105 active:scale-95">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selecionar Motoboy */}
      {motoboyModalPedido && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-5 sm:p-6 rounded-2xl w-full max-w-md border border-primary/20 flex flex-col gap-4 animate-fade-in-up shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">two_wheeler</span>
                Selecionar Motoboy
              </h2>
              <button 
                onClick={() => setMotoboyModalPedido(null)} 
                className="w-8 h-8 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <p className="text-sm text-on-surface-variant">
              Pedido <span className="font-bold text-on-background">#{String(motoboyModalPedido.numero).padStart(4, '0')}</span> - {motoboyModalPedido.cliente_nome}
            </p>
            
            <div className="space-y-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
              {motoboysDisponiveis.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 mb-2 block">two_wheeler</span>
                  <p className="text-sm text-on-surface-variant">Nenhum motoboy disponível</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1">Cadastre ou ative um motoboy na aba Entregas</p>
                </div>
              ) : (
                motoboysDisponiveis.map(motoboy => (
                  <button
                    key={motoboy.id}
                    onClick={() => vincularMotoboy(motoboy.id)}
                    disabled={vinculandoMotoboy}
                    className="w-full p-3 sm:p-4 rounded-xl border border-outline hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-3 sm:gap-4 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <span className="text-lg sm:text-xl font-bold text-emerald-500">{motoboy.nome[0]}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-bold text-on-background text-sm sm:text-base truncate">{motoboy.nome}</div>
                      <div className="text-xs text-on-surface-variant">{motoboy.telefone}</div>
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
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-on-surface-variant">Vinculando motoboy...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-out Detalhe do Pedido */}
      {selectedPedido && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPedido(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] md:w-[450px] bg-surface-container z-[100] border-l border-outline shadow-2xl animate-slide-in-left flex flex-col">
            <div className="p-4 sm:p-6 border-b border-outline flex justify-between items-center bg-surface-dim/30">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-on-background">Pedido #{String(selectedPedido.numero).padStart(4, '0')}</h2>
                <div className="flex gap-2 mt-2 items-center flex-wrap">
                  <span className="text-[9px] sm:text-[10px] tracking-widest uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-md font-bold">{selectedPedido.canal}</span>
                  <span className="text-xs text-on-surface-variant">{format(parseISO(selectedPedido.created_at), "dd/MM 'às' HH:mm", {locale: ptBR})}</span>
                </div>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors shrink-0 hover:scale-110 active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 no-scrollbar">
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">person</span> Cliente
                </h3>
                <div className="bg-surface-dim/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-outline">
                  <p className="font-bold text-base sm:text-lg text-on-background">{selectedPedido.cliente_nome}</p>
                  <p className="text-sm text-on-surface-variant mt-1">{selectedPedido.cliente_telefone || 'Sem telefone'}</p>
                </div>
              </section>

              {selectedPedido.endereco_entrega && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> Endereço
                  </h3>
                  <div className="bg-surface-dim/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-outline flex justify-between items-start gap-3">
                    <p className="text-sm text-on-background/80 leading-relaxed flex-1">{selectedPedido.endereco_entrega}</p>
                    <a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(selectedPedido.endereco_entrega)}`} className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">map</span>
                    </a>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">restaurant_menu</span> Pedido
                </h3>
                <div className="bg-surface-dim/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-outline space-y-3">
                  {selectedPedido.itens.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start gap-3 border-b border-outline/50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-on-background text-sm sm:text-base">{it.qtd}x {it.nome}</p>
                        {it.variacao && <p className="text-xs text-secondary mt-0.5">{it.variacao}</p>}
                        {it.obs && <p className="text-[11px] text-on-surface-variant/40 mt-1 italic">Obs: {it.obs}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-4 sm:p-6 border-t border-outline bg-surface-dim">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <span className="text-xs sm:text-sm text-on-surface-variant uppercase tracking-widest font-bold">
                  Pagamento <br/><span className="text-on-background">{selectedPedido.forma_pagamento}</span>
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400">R$ {selectedPedido.total.toFixed(2)}</span>
              </div>
              {selectedPedido.status_kanban !== 'cancelado' && selectedPedido.status_kanban !== 'entregue' && (
                <button onClick={() => { handleAvançarStatus(selectedPedido) }} className="w-full h-12 sm:h-14 bg-primary hover:bg-primary-bright text-white font-bold rounded-xl sm:rounded-2xl text-base sm:text-lg transition-all active:scale-[0.98] shadow-lg shadow-primary/30 hover:scale-[1.02]">
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
