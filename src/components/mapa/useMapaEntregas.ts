import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { MotoboyPosicao, EntregaAtiva } from '../../types'

/**
 * Hook para gerenciamento de motoboys e entregas no mapa
 * Responsável pela busca, atualização em tempo real e filtros
 */
export function useMapaEntregas(entregasAtivas: EntregaAtiva[]) {
  const [motoboys, setMotoboys] = useState<MotoboyPosicao[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoPos, setEstabelecimentoPos] = useState<[number, number] | null>(null)
  const [localizacaoStatus, setLocalizacaoStatus] = useState<'solicitando' | 'concedida' | 'negada'>('solicitando')

  // Busca tenantId do localStorage
  const tenantId = useMemo(() => {
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
  }, [])

  // Solicita geolocalização do estabelecimento
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setEstabelecimentoPos([latitude, longitude])
          setLocalizacaoStatus('concedida')
        },
        (error) => {
          console.warn('Erro ao obter localização:', error.message)
          setLocalizacaoStatus('negada')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    } else {
      setLocalizacaoStatus('negada')
    }
  }, [])

  // Busca motoboys do banco
  const fetchMotoboys = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('motoboys')
      .select('id, nome, telefone, status, latitude, longitude')
      .eq('tenant_id', tenantId)
      .neq('status', 'inativo')

    if (error) {
      console.error('Erro ao buscar motoboys:', error)
    }

    if (data) {
      setMotoboys(data as MotoboyPosicao[])
    }
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchMotoboys()
  }, [fetchMotoboys])

  // Realtime para atualizações de posição
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`motoboys-position-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'motoboys',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const updatedMotoboy = payload.new as MotoboyPosicao
          setMotoboys(prev => {
            const index = prev.findIndex(m => m.id === updatedMotoboy.id)
            if (index >= 0) {
              const newMotoboys = [...prev]
              newMotoboys[index] = { ...newMotoboys[index], ...updatedMotoboy }
              return newMotoboys
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId])

  // Encontra entrega ativa para um motoboy
  const getEntregaForMotoboy = useCallback(
    (motoboyId: string) => {
      return entregasAtivas.find(e => e.motoboy_id === motoboyId)
    },
    [entregasAtivas]
  )

  // Motoboys filtrados
  const motoboysFiltrados = useMemo(() => {
    return motoboys.filter(m => m.status !== 'inativo')
  }, [motoboys])

  return {
    motoboys: motoboysFiltrados,
    loading,
    estabelecimentoPos,
    localizacaoStatus,
    getEntregaForMotoboy
  }
}
