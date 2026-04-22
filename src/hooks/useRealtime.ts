import { useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'

export type Table = 
  | 'pedidos' | 'pedidos_online' | 'produtos' | 'configuracoes' | 'clientes' 
  | 'cupons' | 'ingredientes' | 'fornecedores' | 'entradas_estoque' 
  | 'ficha_tecnica' | 'caixa' | 'sangrias_caixa' | 'contas_pagar' 
  | 'mesas' | 'motoboys' | 'entradas'

export interface UseRealtimeConfig {
  table: Table
  filter?: string
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
}

export interface UseRealtimeOptions {
  configs: UseRealtimeConfig[]
  enabled?: boolean
}

export function useRealtime(options: UseRealtimeOptions) {
  const { configs, enabled = true } = options
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mountedRef = useRef(true)
  const callbacksRef = useRef<Map<string, (payload: any) => void>>(new Map())

  // Stabilize callbacks map
  useEffect(() => {
    configs.forEach(config => {
      callbacksRef.current.set(config.table, config.callback)
    })
  }, [configs])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled || configs.length === 0) {
      return cleanup
    }

    mountedRef.current = true

    // Build filter string from all configs
    const filterClauses = configs
      .filter(c => c.filter)
      .map(c => c.filter!)
      .join(',')

    const channelName = `realtime-${configs.map(c => c.table).join('-')}-${Date.now()}`

    let channel = supabase.channel(channelName)

    // Subscribe to each table
    configs.forEach(config => {
      const filter = config.filter 
        ? { event: '*', schema: 'public', table: config.table, filter: config.filter }
        : { event: '*', schema: 'public', table: config.table }

      channel = channel.on(
        'postgres_changes',
        filter,
        (payload) => {
          if (!mountedRef.current) return
          const callback = callbacksRef.current.get(config.table)
          if (callback) {
            callback(payload)
          }
        }
      )
    })

    // Subscribe with error handling
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Auto-retry after 3 seconds
        setTimeout(() => {
          if (mountedRef.current && enabled) {
            channel.subscribe()
          }
        }, 3000)
      }
    })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [configs, enabled, cleanup])

  return { cleanup }
}

// Simplified hook for single table (backward compatible)
export function useRealtimeSingle<T extends Record<string, unknown>>(
  table: Table,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  options?: { filter?: string; enabled?: boolean }
) {
  const { filter, enabled = true } = options || {}
  
  const stableCallback = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      callback(payload)
    },
    [callback]
  )

  return useRealtime({
    configs: [{ table, filter, callback: stableCallback }],
    enabled
  })
}