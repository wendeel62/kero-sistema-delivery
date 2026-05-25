import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Produto } from '../pages/CardapioOnlinePage'
import type { Categoria, Mesa, PrecoTamanho, Sabor } from './usePdv'

// ============================================
// TYPES
// ============================================

export interface FetchDataResult {
  produtos: Produto[]
  categorias: Categoria[]
  mesas: Mesa[]
  precosTamanho: Record<string, PrecoTamanho[]>
  sabores: Sabor[]
}

export interface ItemPedidoRow {
  id: string
  tenant_id: string
  pedido_id: string
  produto_id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  total: number
  observacoes: string | null
}

export interface UsePdvApiReturn {
  // Data fetching
  fetchData: () => Promise<FetchDataResult | undefined>
  isLoading: boolean
  error: Error | null

  // Mesa actions
  ocuparMesa: (mesaId: string, responsavel: string, pessoas: number) => Promise<void>
  isOcupandoMesa: boolean

  // Order actions
  salvarPedido: (pedidoData: CreatePedidoData) => Promise<{ success: boolean; error?: string }>
  isSalvandoPedido: boolean

  // Mesa items loading
  loadMesaItens: (mesa: Mesa) => Promise<ItemPedidoRow[]>
  loadMesasComItens: (mesas: Mesa[]) => Promise<Record<string, ItemPedidoRow[]>>
}

export interface CreatePedidoData {
  tenantId: string
  clienteNome: string | null
  clienteTelefone: string | null
  tipo: 'balcao' | 'entrega' | 'mesa'
  mesaNumero: number | null
  subtotal: number
  desconto: number
  total: number
  formaPagamento: string
  observacoes: string | null
  enderecoEntrega: string | null
  itens: Array<{
    produto_id: string
    produto_nome: string
    quantidade: number
    preco_unitario: number
    total: number
    observacoes: string | null
  }>
}

// ============================================
// HOOK
// ============================================

export function usePdvApi(tenantId: string | null) {
  const queryClient = useQueryClient()

  // ----- Data Fetching -----
  const { data: fetchDataResult, isLoading, error, refetch } = useQuery({
    queryKey: ['pdv-data', tenantId],
    queryFn: async (): Promise<FetchDataResult> => {
      const [{ data: prods }, { data: cats }, { data: mesasData }, { data: precos }, { data: saboresData }] = await Promise.all([
        supabase.from('produtos').select('*').eq('tenant_id', tenantId).eq('disponivel', true).order('ordem'),
        supabase.from('categorias').select('*').eq('tenant_id', tenantId).order('ordem'),
        supabase.from('mesas').select('*').eq('tenant_id', tenantId).order('numero'),
        supabase.from('precos_tamanho').select('*').eq('tenant_id', tenantId),
        supabase.from('sabores').select('*').eq('tenant_id', tenantId).eq('disponivel', true).order('nome'),
      ])

      const precosGrouped: Record<string, PrecoTamanho[]> = {}
      if (precos) {
        precos.forEach(p => {
          if (!precosGrouped[p.produto_id]) precosGrouped[p.produto_id] = []
          precosGrouped[p.produto_id].push(p)
        })
      }

      return {
        produtos: prods || [],
        categorias: cats || [],
        mesas: mesasData || [],
        precosTamanho: precosGrouped,
        sabores: saboresData || []
      }
    },
    enabled: !!tenantId
  })

  const fetchData = useCallback(async () => {
    const result = await refetch()
    return result.data
  }, [refetch])

  // ----- Mesa Actions -----
  const { mutateAsync: ocuparMesaAsync, isPending: isOcupandoMesa } = useMutation({
    mutationFn: async ({ mesaId, responsavel, pessoas }: { mesaId: string; responsavel: string; pessoas: number }) => {
      const { error } = await supabase
        .from('mesas')
        .update({
          status: 'ocupada',
          responsavel: responsavel || null,
          pessoas: pessoas,
          aberta_em: new Date().toISOString(),
        })
        .eq('id', mesaId)
        .eq('tenant_id', tenantId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdv-data', tenantId] })
    }
  })

  const ocuparMesa = useCallback(async (mesaId: string, responsavel: string, pessoas: number) => {
    await ocuparMesaAsync({ mesaId, responsavel, pessoas })
  }, [ocuparMesaAsync])

  // ----- Order Actions -----
  const { mutateAsync: salvarPedidoAsync, isPending: isSalvandoPedido } = useMutation({
    mutationFn: async (pedidoData: CreatePedidoData) => {
      const { data: pedido, error: errPed } = await supabase
        .from('pedidos')
        .insert({
          tenant_id: pedidoData.tenantId,
          cliente_nome: pedidoData.clienteNome,
          cliente_telefone: pedidoData.clienteTelefone,
          tipo: pedidoData.tipo,
          mesa_numero: pedidoData.mesaNumero,
          subtotal: pedidoData.subtotal,
          desconto: pedidoData.desconto,
          total: pedidoData.total,
          forma_pagamento: pedidoData.formaPagamento,
          status: 'pendente',
          observacoes: pedidoData.observacoes,
          endereco_entrega: pedidoData.enderecoEntrega,
        })
        .select()
        .single()

      if (errPed) throw new Error(errPed.message)
      if (!pedido) throw new Error('Pedido não criado')

      const itensInsert = pedidoData.itens.map(i => ({
        tenant_id: pedidoData.tenantId,
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        produto_nome: i.produto_nome,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        total: i.total,
        observacoes: i.observacoes,
      }))

      const { error: errItems } = await supabase.from('itens_pedido').insert(itensInsert)
      if (errItems) throw new Error(errItems.message)

      return { success: true, pedidoId: pedido.id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdv-data', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['pedidos', tenantId] })
    }
  })

  const salvarPedido = useCallback(async (pedidoData: CreatePedidoData) => {
    try {
      await salvarPedidoAsync(pedidoData)
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      return { success: false, error: error.message }
    }
  }, [salvarPedidoAsync])

  // ----- Mesa Items Loading -----
  const loadMesaItens = useCallback(async (mesa: Mesa): Promise<ItemPedidoRow[]> => {
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('mesa_numero', mesa.numero)
      .in('status', ['pendente', 'preparando'])
      .order('created_at', { ascending: false })
      .limit(1)

    const ultimoPedido = pedidos?.[0]
    if (ultimoPedido) {
      const { data: itensPedido } = await supabase
        .from('itens_pedido')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('pedido_id', ultimoPedido.id)

      return (itensPedido as ItemPedidoRow[]) || []
    }
    return []
  }, [tenantId])

  const loadMesasComItens = useCallback(async (mesas: Mesa[]): Promise<Record<string, ItemPedidoRow[]>> => {
    const mesasOcupadas = mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento')
    const dados: Record<string, ItemPedidoRow[]> = {}

    await Promise.all(mesasOcupadas.map(async (mesa) => {
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('mesa_numero', mesa.numero)
        .in('status', ['pendente', 'preparando'])
        .order('created_at', { ascending: false })
        .limit(1)

      const ultimoPedido = pedidos?.[0]
      if (ultimoPedido) {
        const { data: itensPedido } = await supabase
          .from('itens_pedido')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('pedido_id', ultimoPedido.id)

        dados[mesa.id] = itensPedido || []
      } else {
        dados[mesa.id] = []
      }
    }))

    return dados
  }, [tenantId])

  return {
    fetchData,
    isLoading,
    error: error || null,
    ocuparMesa,
    isOcupandoMesa,
    salvarPedido,
    isSalvandoPedido,
    loadMesaItens,
    loadMesasComItens,
    produtos: fetchDataResult?.produtos || [],
    categorias: fetchDataResult?.categorias || [],
    mesas: fetchDataResult?.mesas || [],
    precosTamanho: fetchDataResult?.precosTamanho || {},
    sabores: fetchDataResult?.sabores || []
  }
}
