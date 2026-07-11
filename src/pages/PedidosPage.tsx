/**
 * PedidosPage - Página de Gerenciamento de Pedidos
 * 
 * Esta página foi refatorada para usar componentes modulares:
 * - PedidosList: Lista de pedidos com kanban
 * - PedidoFilters: Filtros e busca
 * - PedidoModal: Modal de detalhes do pedido
 * - usePedidosFilters: Hook de filtros
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useTenantId } from '../hooks/useTenantId'
import { usePrinter } from '../hooks/usePrinter'
import { useToast } from '../contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrderData } from '../services/printService'

// Componentes modulares
import { PedidosList } from './pedidos/PedidosList'
import { PedidoFilters } from './pedidos/PedidoFilters'
import { PedidoModal } from './pedidos/PedidoModal'
import { usePedidosFilters, type FiltroData } from './pedidos/usePedidosFilters'
import { MesaGridPanel } from './pedidos/MesaGridPanel'
import { MesaDetailModal } from './pedidos/MesaDetailModal'
import { ProductSelector } from './pedidos/ProductSelector'
import DivisaoConta from '../components/DivisaoConta'
import type { Categoria, Produto } from '../types'

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

export default function PedidosPage() {
  const tenantId = useTenantId() ?? ''
  const queryClient = useQueryClient()
  const toast = useToast()
  const printer = usePrinter()

  const { data: config } = useQuery({
    queryKey: ['configuracoes', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()
      return data as { nome_loja: string; endereco: string; telefone: string; total_mesas?: number; capacidade_mesa?: number } | null
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  })

  const autoPrintedOrders = useRef(new Set<string>())

  // Query de mesas
  const { data: mesas } = useQuery({
    queryKey: ['mesas', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('mesas').select('*').eq('tenant_id', tenantId)
      return data as Array<{ id: string; numero: number; status: string; responsavel?: string; pessoas?: number; aberta_em?: string }> | null
    },
    enabled: !!tenantId,
    staleTime: 30000,
  })

  const [viewMode, setViewMode] = useState<'pedidos' | 'mesas'>('pedidos')
  const [mesaDetailNumero, setMesaDetailNumero] = useState<number | null>(null)
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [productSelectorMesaNumero, setProductSelectorMesaNumero] = useState<number | null>(null)
  const [mesaClosing, setMesaClosing] = useState<{ numero: number; pedidos: UnifiedPedido[] } | null>(null)

  const mapToOrderData = useCallback((pedido: UnifiedPedido): OrderData => {
    return {
      numero: String(pedido.numero),
      cliente_nome: pedido.cliente_nome,
      cliente_telefone: pedido.cliente_telefone,
      tipo_entrega: pedido.canal === 'entrega' ? 'delivery' : 'balcao',
      endereco: pedido.endereco_entrega,
      itens: pedido.itens.map(item => ({
        quantidade: item.qtd,
        nome: item.nome,
        variacao: item.variacao || item.tamanho,
        observacao: item.observacoes,
        preco_unitario: item.preco || 0,
      })),
      subtotal: pedido.total,
      taxa_entrega: 0,
      desconto: 0,
      total: pedido.total,
      forma_pagamento: pedido.forma_pagamento,
      estabelecimento_nome: config?.nome_loja || '',
      estabelecimento_endereco: config?.endereco || '',
      estabelecimento_telefone: config?.telefone || '',
    }
  }, [config])

  // Hook de filtros (antes da query pois getDateRange é usada no queryFn)
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

  // Query de pedidos
  const { data: pedidos = [] as UnifiedPedido[], isLoading, isError, refetch: refetchPedidos } = useQuery({
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
            preco: ip.preco_unitario as number,
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
                  preco: (ip.preco as number) || (ip.preco_unitario as number) || 0,
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

  // Filtragem local: exclui pedidos de mesa (vão na visão Mesas) + busca textual
  const filteredPedidos = useMemo(() => {
    let result = pedidos.filter(p => p.canal !== 'mesa')
    if (busca) {
      const buscaLower = busca.toLowerCase()
      result = result.filter(p =>
        p.cliente_nome?.toLowerCase().includes(buscaLower) ||
        p.cliente_telefone?.includes(buscaLower) ||
        p.numero.toString().includes(buscaLower)
      )
    }
    return result
  }, [pedidos, busca])

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
      if (printer.autoPrint && !autoPrintedOrders.current.has(pedido.id)) {
        try {
          await printer.print(mapToOrderData(pedido))
        } catch { /* silent */ }
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao avancar status do pedido')
    }
  }, [selectedPedido, refetchPedidos, tenantId, printer, mapToOrderData, toast])

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
      toast.error('Erro ao vincular motoboy ao pedido')
    }

    setVinculandoMotoboy(false)
  }

  // ---- Fechar Mesa --------------------------------------------------------

  const handleCloseMesa = useCallback(async (mesaNumero: number) => {
    const mesaPedidos = pedidos.filter(p => p.mesa_numero === mesaNumero && p.status_kanban !== 'cancelado')
    const allEntregue = mesaPedidos.length > 0 && mesaPedidos.every(p => p.status_kanban === 'entregue')
    if (!allEntregue) {
      toast.error('Todos os pedidos da mesa precisam estar como "Entregue" para fechar')
      return
    }
    setMesaDetailNumero(null)
    setMesaClosing({ numero: mesaNumero, pedidos: mesaPedidos })
  }, [pedidos, toast])

  const handleFinalizarMesa = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
    queryClient.invalidateQueries({ queryKey: ['mesas', tenantId] })
    setMesaClosing(null)
    refetchPedidos()
  }, [queryClient, tenantId, refetchPedidos])

  const handleCancelCloseMesa = useCallback(() => {
    setMesaClosing(null)
  }, [])

  const mesaClosingData = useMemo(() => {
    if (!mesaClosing) return null
    const mesaData = mesas?.find(m => m.numero === mesaClosing.numero)
    const mesaItens = mesaClosing.pedidos.flatMap((p, idx) =>
      p.itens.map(item => ({
        id: `${p.id}-${idx}`,
        produto_nome: item.nome,
        quantidade: item.qtd,
        preco_unitario: item.preco || 0,
        total: (item.preco || 0) * item.qtd,
      }))
    )
    const totalGeral = mesaItens.reduce((sum, i) => sum + i.total, 0)
    return {
      mesa: {
        id: mesaData?.id || `mesa-${mesaClosing.numero}`,
        numero: mesaData?.numero || mesaClosing.numero,
        responsavel: mesaData?.responsavel || 'Cliente',
        pessoas: mesaData?.pessoas || 1,
      },
      itens: mesaItens,
      totalGeral,
      pedidos: mesaClosing.pedidos.map(p => ({ id: p.id, tabela: p.tipo_tabela })),
    }
  }, [mesaClosing, mesas])

  // ---- Compute mesas ativas (com pedidos em aberto) ---------------------

  const mesasAtivas = useMemo(() => {
    const mesasOcupadas = new Set<number>()
    ;(mesas || []).filter(m => m.status === 'ocupada').forEach(m => mesasOcupadas.add(m.numero))

    const set = new Set<number>()
    pedidos.filter(p => p.canal === 'mesa' && p.status_kanban !== 'cancelado').forEach(p => {
      if (p.mesa_numero && mesasOcupadas.has(p.mesa_numero)) set.add(p.mesa_numero)
    })
    return set
  }, [pedidos, mesas])

  // ---- Mesa detail computed data ---------------------------------------

  const mesaDetailPedidos = useMemo(() => {
    if (mesaDetailNumero == null) return null
    return pedidos.filter(
      p => p.mesa_numero === mesaDetailNumero && p.canal === 'mesa' && p.status_kanban !== 'cancelado'
    )
  }, [pedidos, mesaDetailNumero])

  // ---- Queries de produtos e categorias para ProductSelector ------------

  const { data: produtosCardapio = [] as Produto[] } = useQuery({
    queryKey: ['produtos-cardapio', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('produtos').select('*').eq('tenant_id', tenantId).eq('disponivel', true)
      return (data || []) as Produto[]
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: categoriasCardapio = [] as Categoria[] } = useQuery({
    queryKey: ['categorias-cardapio', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('categorias').select('*').eq('tenant_id', tenantId)
      return (data || []) as Categoria[]
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  })

  // ---- ProductSelector handlers ------------------------------------------

  const handleAddProdutoToMesa = useCallback((mesaNumero: number) => {
    setProductSelectorMesaNumero(mesaNumero)
    setShowProductSelector(true)
  }, [])

  const { mutateAsync: salvarPedidoMesa } = useMutation({
    mutationFn: async ({ mesaNumero, itens, total }: { mesaNumero: number; itens: Array<{ produto_id: string; produto_nome: string; quantidade: number; preco_unitario: number }>; total: number }) => {
      const maxNumero = await supabase
        .from('pedidos')
        .select('numero')
        .eq('tenant_id', tenantId)
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextNumero = (maxNumero.data?.numero || 0) + 1

      const { data: pedido, error } = await supabase.from('pedidos').insert({
        tenant_id: tenantId,
        numero: nextNumero,
        cliente_nome: `Mesa ${mesaNumero}`,
        tipo: 'mesa',
        mesa_numero: mesaNumero,
        subtotal: total,
        total,
        status: 'pendente',
        forma_pagamento: '',
      }).select().single()

      if (error) throw error

      const itensInsert = itens.map(i => ({
        tenant_id: tenantId,
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        produto_nome: i.produto_nome,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        total: i.preco_unitario * i.quantidade,
      }))

      const { error: itensError } = await supabase.from('itens_pedido').insert(itensInsert)
      if (itensError) throw itensError

      return pedido
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
      toast.success('Produtos adicionados com sucesso!')
      setShowProductSelector(false)
      setProductSelectorMesaNumero(null)
    },
    onError: (err) => {
      console.error(err)
      toast.error('Erro ao adicionar produtos')
    }
  })

  // ---- Manual print handler ------------------------------------------------

  const handlePrint = useCallback((pedido: UnifiedPedido) => {
    if (config) {
      printer.print(mapToOrderData(pedido))
    }
  }, [config, printer, mapToOrderData])

  // ---- Auto-print on new order

    const handleAutoPrint = useCallback(async (payload: { new: Record<string, unknown> }, origemTabela: 'pedidos' | 'pedidos_online') => {
      if (!config || !printer.autoPrint) return

      const pedidoId = (payload.new.id as string) || ''
      if (!pedidoId) return

      // Deduplicacao: se ja tentou imprimir este pedido nesta sessao, ignora.
      if (autoPrintedOrders.current.has(pedidoId)) return
      autoPrintedOrders.current.add(pedidoId)

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
              preco: ip.preco_unitario as number,
              variacao: ip.tamanho as string,
              observacoes: ip.observacoes as string,
            }))
          }

          await printer.print(mapToOrderData(unified))
        } else {
          const p = payload.new
          let itensArray: UnifiedPedido['itens'] = []

          if (p.itens) {
            try {
              const parsed = typeof p.itens === 'string' ? JSON.parse(p.itens as string) : p.itens
              itensArray = Array.isArray(parsed)
                ? parsed.map((ip: Record<string, unknown>) => ({
                    nome: (ip.produto_nome as string) || (ip.nome as string),
                    qtd: (ip.quantidade as number) || (ip.qtd as number),
                    preco: (ip.preco as number) || (ip.preco_unitario as number) || 0,
                    variacao: (ip.tamanho as string) || (ip.variacao as string),
                    observacoes: (ip.observacoes as string) || (ip.obs as string),
                  }))
                : []
            } catch {
              console.warn('[KeroPrint] Falha ao fazer parse de itens do pedido online:', p.itens)
            }
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

          await printer.print(mapToOrderData(unified))
        }
      } catch (err) {
        console.error('[KeroPrint] Erro na impressao automatica:', err)
        toast.error('Falha ao imprimir pedido automaticamente — verifique a impressora')
      }
    }, [config, printer, toast, mapToOrderData])

  return (
    <div className="min-h-screen py-8 px-4 lg:px-8 space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="shrink-0 animate-slide-in-down">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold font-headline text-on-background tracking-tight">
                  {viewMode === 'pedidos' ? 'Pedidos' : 'Mesas'}
                </h1>
                <p className="text-on-surface-variant mt-1 text-lg">
                  {viewMode === 'pedidos' ? 'Kanban em tempo real — fluxo de cozinha e entrega' : 'Mesas com pedidos ativos'}
                </p>
              </div>
              <button
                onClick={() => setViewMode(v => v === 'pedidos' ? 'mesas' : 'pedidos')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  viewMode === 'mesas'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-base">table_restaurant</span>
                MESA
                {viewMode === 'pedidos' && mesasAtivas.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] text-center leading-tight">
                    {mesasAtivas.size}
                  </span>
                )}
              </button>
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

      {viewMode === 'mesas' ? (
        <MesaGridPanel
          totalMesas={config?.total_mesas ?? 10}
          mesasAtivas={mesasAtivas}
          onMesaClick={setMesaDetailNumero}
          isLoading={isLoading}
        />
      ) : isError ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4 p-8 rounded-2xl border border-outline bg-surface-container max-w-md">
            <span className="material-symbols-outlined text-5xl text-primary">error_outline</span>
            <h2 className="text-xl font-bold text-on-background">Erro ao carregar pedidos</h2>
            <p className="text-on-surface-variant text-sm">Nao foi possivel carregar os pedidos. Verifique sua conexao e tente novamente.</p>
            <button
              onClick={() => refetchPedidos()}
              className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-bright transition-smooth"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      ) : (
        <PedidosList
          pedidos={filteredPedidos}
          onAdvance={handleAvançarStatus}
          onCancel={setCancelModalPedido}
          onView={setSelectedPedido}
          onPrint={handlePrint}
          isLoading={isLoading}
        />
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

      {/* Modal Detalhes da Mesa */}
      {mesaDetailNumero != null && mesaDetailPedidos && (
        <MesaDetailModal
          mesaNumero={mesaDetailNumero}
          pedidos={mesaDetailPedidos}
          onClose={() => setMesaDetailNumero(null)}
          onAddProduct={handleAddProdutoToMesa}
          onCloseBill={handleCloseMesa}
        />
      )}

      {/* Modal ProductSelector */}
      {showProductSelector && productSelectorMesaNumero != null && (
        <ProductSelector
          produtos={produtosCardapio}
          categorias={categoriasCardapio}
          onConfirm={(itens) => {
            const total = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
            salvarPedidoMesa({ mesaNumero: productSelectorMesaNumero, itens, total })
          }}
          onCancel={() => {
            setShowProductSelector(false)
            setProductSelectorMesaNumero(null)
          }}
        />
      )}

      {/* Modal Detalhes do Pedido */}
      {selectedPedido && (
        <PedidoModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
          onAdvance={handleAvançarStatus}
        />
      )}

      {/* Modal Fechar Mesa */}
      {mesaClosingData && (
        <DivisaoConta
          mesa={mesaClosingData.mesa}
          itens={mesaClosingData.itens}
          totalGeral={mesaClosingData.totalGeral}
          pedidos={mesaClosingData.pedidos}
          onFechar={handleFinalizarMesa}
          onCancelar={handleCancelCloseMesa}
        />
      )}
    </div>
  )
}
