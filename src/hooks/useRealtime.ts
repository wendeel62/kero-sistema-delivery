import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Table = 'pedidos' | 'pedidos_online' | 'produtos' | 'configuracoes' | 'clientes' | 'cupons' | 'ingredientes' | 'fornecedores' | 'entradas_estoque' | 'ficha_tecnica' | 'caixa' | 'sangrias_caixa' | 'contas_pagar' | 'mesas' | 'motoboys' | 'entregas'

export function useRealtime<T extends Record<string, unknown>>(
  table: Table,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => callback(payload as RealtimePostgresChangesPayload<T>)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, callback])
}
