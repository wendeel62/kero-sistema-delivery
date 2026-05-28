/**
 * PedidosPage - Página de Gerenciamento de Pedidos
 * 
 * Esta página foi refatorada para usar componentes modulares:
 * - PedidosList: Lista de pedidos com kanban
 * - PedidoFilters: Filtros e busca
 * - PedidoModal: Modal de detalhes do pedido
 * - usePedidosFilters: Hook de filtros
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { usePrinter } from '../hooks/usePrinter'
import { useToast } from '../contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Componentes modulares
import { PedidosList } from './pedidos/PedidosList'
import { PedidoFilters } from './pedidos/PedidoFilters'
import { PedidoModal } from './pedidos/PedidoModal'
import { usePedidosFilters, type FiltroData } from './pedidos/usePedidosFilters'

// Types
export type UnifiedPedido = {
  id: string
  numero: number
  cliente_nome: string
  cliente_telefone: string
  total: number
  tipo_tabela: 'pedidos' | 'pedidos_online'
  raw_status: string
  status_kanban: 'novo' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado'
  created_at: string
  canal: 'balcao' | 'entrega' | 'mesa' | 'app' | 'ifood' | 'rappi'
  forma_pagamento: string
  itens: Array<{ qtd: number; nome: string; preco?: number; observacoes?: string; tamanho?: string; variacao?: string }>
  endereco_entrega?: string
  updated_at?: string
  mesa_numero?: number
}

const playAlertSound = () => {
  const audio = new Audio('/notification.mp3')
  audio.play().catch(console.error)
}

const mapKanbanStatus = (rawStatus: string): UnifiedPedido['status_kanban'] => {
  if (['aberto', 'pendente', 'confirmado', 'em_preparo'].includes(rawStatus)) return 'novo'
  if (rawStatus === 'preparando') return 'em_preparo'
  if (['pronto', 'saiu_entrega'].includes(rawStatus)) return 'saiu_entrega'
  if (rawStatus === 'entregue') return 'entregue'
  return 'cancelado'
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

export default function PedidosPage() {
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantId() || user?.id || ''
  const queryClient = useQueryClient()
  const toast = useToast()
  const printer = usePrinter()

  const print = printer.print
  const config = printer.config
  const isAutoEnabled = printer.isAutoEnabled

  // Hook de filtros
  const {
    filtroData,
    dataInicio,
    dataFim,
    showFiltroPersonalizado,
    busca,
    setFiltroData,
    setDataInicio,
    setDataFim,
    setShowFiltroPersonalizado,
    setBusca,
    getDateRange
  } = usePedidosFilters([])

  // Estados locais
  const [selectedPedido, setSelectedPedido] = useState<UnifiedPedido | null>(null)
  const [cancelModalPedido, setCancelModalPedido] = useState<UnifiedPedido | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [motoboyModalPedido, setMotoboyModalPedido] = useState<UnifiedPedido | null>(null)
  const [motoboysDisponiveis, setMotoboysDisponiveis] = useState<Array<Record<string, unknown>>>([])
  const [vinculandoMotoboy, setVinculandoMotoboy] = useState(false)
  const [_currentTime, setCurrentTime] = useState(new Date())

  // Timer para atualizar o tempo decorrido
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Query de pedidos
  const { data: pedidos = [] as UnifiedPedido[], isLoading, refetch: refetchPedidos } = useQuery({
    queryKey: ['pedidos', tenantId, filtroData, dataInicio, dataFim],
    queryFn: async () => {
      const { inicio, fim } = getDateRange()

      const { data: pdvList } = await supabase
        .from('pedidos')
        .select('*, itens_pedido(*)')
        .eq('tenant_id', tenantId)
        .gte('created_at', inicio)
        .lte('created_at', fim)

      const { data: onlineList } = await supabase
        .from('pedidos_online')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', inicio)
        .lte('created_at', fim)

      const unified: UnifiedPedido[] = []

      ;(pdvList || []).forEach((p: Record<string, unknown>) => {
        unified.push({
          id: p.id as string,
          numero: p.numero as number,
          cliente_nome: (p.cliente_nome as string) || ((p.tipo as string) === 'mesa' ? `Mesa ${p.mesa_numero as number}` : 'Cliente Balcão'),
          cliente_telefone: (p.cliente_telefone as string) || '',
          total: Number(p.total),
          tipo_tabela: 'pedidos',
          raw_status: p.status as string,
          status_kanban: mapKanbanStatus(p.status as string),
          created_at: p.created_at as string,
          canal: p.tipo as UnifiedPedido['canal'],
          forma_pagamento: p.forma_pagamento as string,
          endereco_entrega: p.endereco_entrega as string,
          mesa_numero: p.mesa_numero as number,
          itens: (p.itens_pedido as Array<Record<string, unknown>>)?.map((ip: Record<string, unknown>) => ({
            nome: ip.produto_nome as string,
            qtd: ip.quantidade as number,
            variacao: ip.tamanho as string,
            obs: ip.observacoes as string
          })) || []
        })
      })

      ;(onlineList || []).forEach((p: Record<string, unknown>) => {
        let itensArray: Array<Record<string, unknown>> = []

        if (p.itens) {
          try {
            const parsedItens = typeof p.itens === 'string' ? JSON.parse(p.itens as string) : p.itens
            itensArray = Array.isArray(parsedItens)
              ? (parsedItens as Array<Record<string, unknown>>).map((ip: Record<string, unknown>) => ({
                  nome: (ip.produto_nome as string) || (ip.nome as string),
                  qtd: (ip.quantidade as number) || (ip.qtd as number),
                  variacao: (ip.tamanho as string) || (ip.variacao as string),
                  obs: (ip.observacoes as string) || (ip.obs as string)
                }))
              : []
          } catch (e) {
            console.error('Erro ao parsear itens:', e)
            itensArray = []
          }
        }

        unified.push({
          id: p.id as string,
          numero: p.numero as number,
          cliente_nome: p.cliente_nome as string,
          cliente_telefone: p.cliente_telefone as string,
          total: Number(p.total),
          tipo_tabela: 'pedidos_online',
          raw_status: p.status as string,
          status_kanban: mapKanbanStatus(p.status as string),
          created_at: p.created_at as string,
          canal: 'app',
          forma_pagamento: p.forma_pagamento as string,
          endereco_entrega: `${p.endereco as string}, ${p.numero_endereco as string} - ${p.bairro as string}`,
          itens: itensArray as UnifiedPedido['itens']
        })
      })

      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return unified
    },
    staleTime: 30000,
    refetchOnMount: true,
    enabled: !!tenantId
  })

  // Realtime
  useRealtime({
    configs: [
      {
        table: 'pedidos',
        filter: `tenant_id=eq.${tenantId}`,
        callback: (payload) => {
          playAlertSound()
          queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
          if (payload.eventType === 'INSERT') {
            handleAutoPrint(payload, 'pedidos')
          }
        }
      },
      {
        table: 'pedidos_online',
        filter: `tenant_id=eq.${tenantId}`,
        callback: (payload) => {
          playAlertSound()
          queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
          if (payload.eventType === 'INSERT') {
            handleAutoPrint(payload, 'pedidos_online')
          }
        }
      }
    ]
  })

  // Ações
  const handleAvançarStatus = useCallback(async (pedido: UnifiedPedido) => {
    const isDelivery = ['entrega', 'app', 'ifood', 'rappi'].includes(pedido.canal)
    const nextStatusMap: Record<string, string> = isDelivery
      ? {
          aberto: 'preparando',
          pendente: 'preparando',
          confirmado: 'preparando',
          preparando: 'saiu_entrega',
          pronto: 'saiu_entrega',
          saiu_entrega: 'entregue'
        }
      : {
          aberto: 'preparando',
          pendente: 'preparando',
          confirmado: 'preparando',
          preparando: 'entregue',
          pronto: 'entregue',
          saiu_entrega: 'entregue'
        }

    const nextRaw = nextStatusMap[pedido.raw_status]
    if (!nextRaw) return

    const needsMotoboy = isDelivery && pedido.raw_status === 'preparando'
    if (needsMotoboy) {
      const { data } = await supabase.from('motoboys').select('*').eq('disponivel', true)
      if (data) setMotoboysDisponiveis(data)
      setMotoboyModalPedido(pedido)
      return
    }

    try {
      await supabase.from(pedido.tipo_tabela).update({ status: nextRaw }).eq('id', pedido.id).eq('tenant_id', tenantId)
      refetchPedidos()
      if (selectedPedido?.id === pedido.id) {
        setSelectedPedido({ ...selectedPedido, raw_status: nextRaw, status_kanban: mapKanbanStatus(nextRaw) })
      }
    } catch (err) {
      console.error(err)
    }
  }, [selectedPedido, refetchPedidos, tenantId])

  const { mutate: cancelarPedido } = useMutation({
    mutationFn: async ({ pedido, motivo }: { pedido: UnifiedPedido; motivo: string }) => {
      await supabase.from(pedido.tipo_tabela).update({ status: 'cancelado' }).eq('id', pedido.id).eq('tenant_id', tenantId)
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
      setCancelModalPedido(null)
    },
    onError: () => {
      toast.error('Erro ao cancelar pedido')
    }
  })

  const vincularMotoboy = async (motoboyId: string) => {
    if (!motoboyModalPedido) return
    setVinculandoMotoboy(true)

    try {
      await supabase.from(motoboyModalPedido.tipo_tabela).update({ status: 'saiu_entrega', motoboy_id: motoboyId }).eq('id', motoboyModalPedido.id)
      await supabase.from('entregas').insert({
        pedido_id: motoboyModalPedido.id,
        motoboy_id: motoboyId,
        tenant_id: tenantId,
        status: 'atribuido',
        atribuido_em: new Date().toISOString()
      })
      await supabase.from('motoboys').update({ status: 'em_entrega', disponivel: false }).eq('id', motoboyId)
      setMotoboyModalPedido(null)
      refetchPedidos()
    } catch (err) {
      console.error('Erro ao vincular motoboy:', err)
    }

    setVinculandoMotoboy(false)
  }

  // ---- Manual print handler ------------------------------------------------

  const handlePrint = useCallback((pedido: UnifiedPedido) => {
    if (config) {
      print(pedido, config)
    }
  }, [print, config])

  // ---- Auto-print on new order ---------------------------------------------

  const handleAutoPrint = useCallback(async (payload: { new: Record<string, unknown> }, origemTabela: 'pedidos' | 'pedidos_online') => {
    if (!config || !isAutoEnabled) return

    try {
      if (origemTabela === 'pedidos') {
        const { data: pedidoCompleto } = await supabase
          .from('pedidos')
          .select('*, itens_pedido(*)')
          .eq('id', payload.new.id)
          .single()

        if (!pedidoCompleto) return

        const unified: UnifiedPedido = {
          id: pedidoCompleto.id,
          numero: pedidoCompleto.numero,
          cliente_nome: pedidoCompleto.cliente_nome || '',
          cliente_telefone: pedidoCompleto.cliente_telefone || '',
          total: Number(pedidoCompleto.total),
          tipo_tabela: 'pedidos',
          raw_status: pedidoCompleto.status,
          status_kanban: mapKanbanStatus(pedidoCompleto.status),
          created_at: pedidoCompleto.created_at,
          canal: pedidoCompleto.tipo || 'balcao',
          forma_pagamento: pedidoCompleto.forma_pagamento || '',
          endereco_entrega: pedidoCompleto.endereco_entrega,
          mesa_numero: pedidoCompleto.mesa_numero,
          itens: (pedidoCompleto.itens_pedido || []).map((ip: Record<string, unknown>) => ({
            nome: ip.produto_nome as string,
            qtd: ip.quantidade as number,
            variacao: ip.tamanho as string,
            obs: ip.observacoes as string,
          }))
        }

        print(unified, config)
      } else {
        const p = payload.new
        let itensArray: UnifiedPedido['itens'] = []

        if (p.itens) {
          const parsed = typeof p.itens === 'string' ? JSON.parse(p.itens as string) : p.itens
          itensArray = Array.isArray(parsed)
            ? parsed.map((ip: Record<string, unknown>) => ({
                nome: (ip.produto_nome as string) || (ip.nome as string),
                qtd: (ip.quantidade as number) || (ip.qtd as number),
                variacao: (ip.tamanho as string) || (ip.variacao as string),
                obs: (ip.observacoes as string) || (ip.obs as string),
              }))
            : []
        }

        const unified: UnifiedPedido = {
          id: p.id as string,
          numero: p.numero as number,
          cliente_nome: p.cliente_nome as string,
          cliente_telefone: p.cliente_telefone as string,
          total: Number(p.total),
          tipo_tabela: 'pedidos_online',
          raw_status: p.status as string,
          status_kanban: mapKanbanStatus(p.status as string),
          created_at: p.created_at as string,
          canal: 'app',
          forma_pagamento: p.forma_pagamento as string,
          itens: itensArray,
        }

        print(unified, config)
      }
    } catch (err) {
      console.error('[KeroPrint] Erro na impressão automática:', err)
      toast.error('Falha ao imprimir pedido automaticamente — verifique a impressora')
    }
  }, [config, isAutoEnabled, print, toast])

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
              <p className="text-on-surface-variant mt-1 text-lg">Kanban em tempo real — fluxo de cozinha e entrega</p>
            </div>
          </div>

          {/* Filtros */}
          <PedidoFilters
            filtroData={filtroData as FiltroData}
            dataInicio={dataInicio}
            dataFim={dataFim}
            showFiltroPersonalizado={showFiltroPersonalizado}
            busca={busca}
            onSetFiltroData={setFiltroData}
            onSetDataInicio={setDataInicio}
            onSetDataFim={setDataFim}
            onSetShowFiltroPersonalizado={setShowFiltroPersonalizado}
            onSetBusca={setBusca}
          />
        </div>
      </header>

      {/* Lista de Pedidos (Kanban) */}
      <PedidosList
        pedidos={pedidos}
        onAdvance={handleAvançarStatus}
        onCancel={setCancelModalPedido}
        onView={setSelectedPedido}
        onPrint={handlePrint}
        isLoading={isLoading}
      />

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
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-surface-dim rounded-xl p-3 text-sm text-on-background border border-outline focus:border-red-500 outline-none resize-none min-h-[100px]"
              placeholder="Diga o motivo para registro..."
            />
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => { setCancelModalPedido(null); setCancelReason('') }} className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high font-bold text-sm transition-colors">
                Voltar
              </button>
              <button onClick={() => cancelarPedido({ pedido: cancelModalPedido, motivo: cancelReason })} disabled={!cancelReason.trim()} className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Motoboy */}
      {motoboyModalPedido && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-5 sm:p-6 rounded-2xl w-full max-w-md border border-primary/20 flex flex-col gap-4 animate-fade-in-up shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">two_wheeler</span>
                Selecionar Motoboy
              </h2>
              <button onClick={() => setMotoboyModalPedido(null)} className="w-8 h-8 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {motoboysDisponiveis.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 mb-2 block">two_wheeler</span>
                  <p className="text-sm text-on-surface-variant">Nenhum motoboy disponível</p>
                </div>
              ) : (
                motoboysDisponiveis.map((motoboy: Record<string, unknown>) => (
                  <button
                    key={motoboy.id as string}
                    onClick={() => vincularMotoboy(motoboy.id as string)}
                    disabled={vinculandoMotoboy}
                    className="w-full p-3 rounded-xl border border-outline hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-emerald-500">{(motoboy.nome as string)[0]}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-on-background">{motoboy.nome as string}</div>
                      <div className="text-xs text-on-surface-variant">{motoboy.telefone as string}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Pedido */}
      {selectedPedido && (
        <PedidoModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
          onAdvance={handleAvançarStatus}
        />
      )}
    </div>
  )
}
