// usePedidos.ts
// Hook para lógica de pedidos
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

interface Pedido {
  id: string
  numero: number
  cliente_nome: string
  total: number
  status: string
}

interface usePedidosOptions {
  tenantId: string
  status?: string
}

export function usePedidos({ tenantId, status }: usePedidosOptions) {
  const [loading, setLoading] = useState(false)

  const fetchPedidos = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('pedidos').select('*').eq('tenant_id', tenantId)
      if (status) {
        query = query.eq('status', status)
      }
      const { data } = await query
      return data as Pedido[]
    } finally {
      setLoading(false)
    }
  }, [tenantId, status])

  return {
    loading,
    fetchPedidos
  }
}