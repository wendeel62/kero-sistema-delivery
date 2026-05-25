import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'

export type Table =
  | 'pedidos' | 'pedidos_online' | 'produtos' | 'configuracoes' | 'clientes'
  | 'cupons' | 'ingredientes' | 'fornecedores' | 'entradas_estoque'
  | 'ficha_tecnica' | 'caixa' | 'sangrias_caixa' | 'contas_pagar'
  | 'mesas' | 'motoboys' | 'entradas' | 'notificacoes'
  | 'user_roles' | 'user_profiles' | 'audit_logs'
  | 'metas_faturamento' | 'historico_agente'

export interface UseRealtimeConfig {
  table: Table
  filter?: string
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

export interface UseRealtimeOptions {
  configs: UseRealtimeConfig[]
  enabled?: boolean
}

export function useRealtime(options: UseRealtimeOptions) {
  const { configs, enabled = true } = options
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mountedRef = useRef(true)
  const callbacksRef = useRef<Map<string, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void>>(new Map())

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

    // Stable channel name based on tables (no Date.now() to prevent leak)
    const channelName = `realtime-${configs.map(c => c.table).sort().join('-')}`

    let channel = supabase.channel(channelName)

    // Subscribe to each table
    configs.forEach(config => {
      const filterObj = config.filter
        ? { event: '*' as const, schema: 'public', table: config.table, filter: config.filter }
        : { event: '*' as const, schema: 'public', table: config.table }

      channel = channel.on(
        'postgres_changes',
        filterObj,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
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
  }, [enabled, cleanup, configs])

  return { cleanup }
}

// Simplified hook for single table (backward compatible)
export function useRealtimeSingle(
  table: Table,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  options?: { filter?: string; enabled?: boolean }
) {
  const { filter, enabled = true } = options || {}

  const stableCallback = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      callback(payload)
    },
    [callback]
  )

  return useRealtime({
    configs: [{ table, filter, callback: stableCallback }],
    enabled
  })
}
