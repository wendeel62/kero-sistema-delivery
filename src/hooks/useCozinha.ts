import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { playNovoPedidoSound } from '../utils/audioKDS'

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
      .in('status', ['novo', 'pendente', 'aberto', 'em_preparo', 'preparando'])
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar pedidos:', error)
      return
    }

    const novos: PedidoKDS[] = []
    const emPreparo: PedidoKDS[] = []

    ;(pedidos || []).forEach((p: any) => {
      const pedido: PedidoKDS = {
        id: p.id,
        numero: p.numero,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at || p.created_at,
        tipo: p.tipo,
        cliente_nome: p.cliente_nome,
        observacoes: p.observacoes,
        itens: (p.itens_pedido || []).map((ip: any) => ({
          id: ip.id,
          produto_nome: ip.produto_nome,
          quantidade: ip.quantidade,
          tamanho: ip.tamanho,
          adicionais: ip.adicionais,
          observacoes: ip.observacoes,
        })),
      }

      if (['novo', 'pendente', 'aberto'].includes(p.status)) {
        novos.push(pedido)
      } else if (p.status === 'em_preparo' || p.status === 'preparando') {
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

  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel('cozinha-pedidos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pedidos',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const novo = payload.new as any
          if (['novo', 'pendente', 'aberto'].includes(novo.status)) {
            playNovoPedidoSound()
            refetch()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const atualizado = payload.new as any
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, refetch])

  const iniciarPreparo = useCallback(
    async (pedidoId: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'em_preparo', updated_at: new Date().toISOString() })
        .eq('id', pedidoId)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Erro ao iniciar preparo:', error)
        return false
      }

      await supabase.from('historico_status').insert({
        pedido_id: pedidoId,
        origem_tabela: 'pedidos',
        status_anterior: 'novo',
        status_novo: 'em_preparo',
        tenant_id: tenantId,
      })

      return true
    },
    [tenantId]
  )

  const marcarPronto = useCallback(
    async (pedidoId: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'pronto', updated_at: new Date().toISOString() })
        .eq('id', pedidoId)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Erro ao marcar pronto:', error)
        return false
      }

      await supabase.from('historico_status').insert({
        pedido_id: pedidoId,
        origem_tabela: 'pedidos',
        status_anterior: 'em_preparo',
        status_novo: 'pronto',
        tenant_id: tenantId,
      })

      return true
    },
    [tenantId]
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
