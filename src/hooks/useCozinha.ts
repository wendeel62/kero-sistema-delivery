import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useRealtime } from './useRealtime'
import { playNovoPedidoSound } from '../utils/audioKDS'
import { handleSupabaseError } from '../lib/supabaseErrorHandler'

interface PedidoKDS {
  id: string
  numero: number
  status: string
  created_at: string
  updated_at: string
  tipo: string
  cliente_nome: string
  observacoes?: string
  itens: Array<{
    id: string
    produto_nome: string
    quantidade: number
    tamanho?: string
    adicionais?: string
    observacoes?: string
  }>
}

interface UseCozinhaOptions {
  tenantId: string
}

export function useCozinha({ tenantId }: UseCozinhaOptions) {
  const [pedidosNovos, setPedidosNovos] = useState<PedidoKDS[]>([])
  const [pedidosEmPreparo, setPedidosEmPreparo] = useState<PedidoKDS[]>([])

  const fetchPedidos = useCallback(async () => {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('*, itens_pedido(*)')
      .in('status', ['novo', 'pendente', 'aberto', 'preparando'])
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (handleSupabaseError(error, 'useCozinha.fetchPedidos')) return

    const novos: PedidoKDS[] = []
    const emPreparo: PedidoKDS[] = []

    ;(pedidos || []).forEach((p) => {
      const pedido: PedidoKDS = {
        id: p.id,
        numero: p.numero,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at || p.created_at,
        tipo: p.tipo,
        cliente_nome: p.cliente_nome,
        observacoes: p.observacoes,
        itens: ((p.itens_pedido || []) as Array<Record<string, unknown>>).map((ip: Record<string, unknown>) => ({
          id: ip.id as string,
          produto_nome: ip.produto_nome as string,
          quantidade: ip.quantidade as number,
          tamanho: ip.tamanho as string | undefined,
          adicionais: ip.adicionais as string | undefined,
          observacoes: ip.observacoes as string | undefined,
        })),
      }

      if (['novo', 'pendente', 'aberto'].includes(p.status)) {
        novos.push(pedido)
      } else if (p.status === 'preparando') {
        emPreparo.push(pedido)
      }
    })

    setPedidosNovos(novos)
    setPedidosEmPreparo(emPreparo)
  }, [tenantId])

  const { refetch, isLoading } = useQuery({
    queryKey: ['cozinha-pedidos', tenantId],
    queryFn: fetchPedidos,
    enabled: !!tenantId,
    refetchInterval: 5000,
  })

  // Use useRealtime instead of manual channel management
  useRealtime({
    configs: [
      {
        table: 'pedidos',
        filter: `tenant_id=eq.${tenantId}`,
        callback: () => {
          playNovoPedidoSound()
          refetch()
        },
      },
    ],
    enabled: !!tenantId,
  })

  const iniciarPreparo = useCallback(
    async (pedidoId: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'preparando', updated_at: new Date().toISOString() })
        .eq('id', pedidoId)
        .eq('tenant_id', tenantId)

      if (handleSupabaseError(error, 'useCozinha.iniciarPreparo')) return false

      await supabase.from('historico_status').insert({
        pedido_id: pedidoId,
        origem_tabela: 'pedidos',
        status_anterior: 'novo',
        status_novo: 'preparando',
        tenant_id: tenantId,
      })

      refetch()
      return true
    },
    [tenantId, refetch]
  )

  const marcarPronto = useCallback(
    async (pedidoId: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'pronto', updated_at: new Date().toISOString() })
        .eq('id', pedidoId)
        .eq('tenant_id', tenantId)

      if (handleSupabaseError(error, 'useCozinha.marcarPronto')) return false

      await supabase.from('historico_status').insert({
        pedido_id: pedidoId,
        origem_tabela: 'pedidos',
        status_anterior: 'preparando',
        status_novo: 'pronto',
        tenant_id: tenantId,
      })

      refetch()
      return true
    },
    [tenantId, refetch]
  )

  return {
    pedidosNovos,
    pedidosEmPreparo,
    isLoading,
    iniciarPreparo,
    marcarPronto,
    refetch,
  }
}
