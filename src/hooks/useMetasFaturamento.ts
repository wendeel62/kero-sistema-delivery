import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { supabase } from '../lib/supabase'

export type MetaPeriodo = 'dia' | 'semana' | 'mes'

export interface MetaFaturamentoPeriodo {
  meta: number | null
  realizado: number
  percentual: number
  cor: string
  falta: number
}

interface MetasFaturamentoRaw {
  dia?: number
  semana?: number
  mes?: number
}

function getCor(percentual: number) {
  if (percentual >= 80) return '#22c55e'
  if (percentual >= 50) return '#f59e0b'
  return '#e8391a'
}

function buildPeriodo(meta: number | null, realizado: number): MetaFaturamentoPeriodo {
  const percentual = meta && meta > 0 ? Math.min(Math.round((realizado / meta) * 100), 999) : 0
  const falta = meta != null ? Math.max(meta - realizado, 0) : 0

  return {
    meta,
    realizado,
    percentual,
    cor: getCor(percentual),
    falta,
  }
}

function padDateTime(value: Date) {
  return format(value, 'yyyy-MM-dd HH:mm:ss')
}

export function useMetasFaturamento(tenantId: string, enabled = true) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['metas-faturamento', tenantId],
    queryFn: async () => {
      if (!tenantId) return {
        dia: buildPeriodo(null, 0),
        semana: buildPeriodo(null, 0),
        mes: buildPeriodo(null, 0),
      }

      const now = new Date()
      const diaStart = padDateTime(startOfDay(now))
      const diaEnd = padDateTime(endOfDay(now))
      const semanaStart = padDateTime(startOfWeek(now, { weekStartsOn: 1 }))
      const semanaEnd = padDateTime(endOfWeek(now, { weekStartsOn: 1 }))
      const mesStart = padDateTime(startOfMonth(now))
      const mesEnd = padDateTime(endOfMonth(now))

      const [{ data: configData }, { data: diaPedidos }, { data: semanaPedidos }, { data: mesPedidos }] = await Promise.all([
        supabase.from('configuracoes').select('id, metas_faturamento').eq('tenant_id', tenantId).limit(1).single(),
        supabase.from('pedidos').select('total').eq('tenant_id', tenantId).eq('status', 'entregue').gte('created_at', diaStart).lte('created_at', diaEnd),
        supabase.from('pedidos').select('total').eq('tenant_id', tenantId).eq('status', 'entregue').gte('created_at', semanaStart).lte('created_at', semanaEnd),
        supabase.from('pedidos').select('total').eq('tenant_id', tenantId).eq('status', 'entregue').gte('created_at', mesStart).lte('created_at', mesEnd),
      ])

      const metas = (configData?.metas_faturamento || {}) as MetasFaturamentoRaw
      const configId = configData?.id
      const total = (items: any[] | null) => (items || []).reduce((acc, item) => acc + Number(item.total || 0), 0)

      return {
        configId,
        dia: buildPeriodo(metas.dia ?? null, total(diaPedidos)),
        semana: buildPeriodo(metas.semana ?? null, total(semanaPedidos)),
        mes: buildPeriodo(metas.mes ?? null, total(mesPedidos)),
      }
    },
    enabled: !!tenantId && enabled,
    staleTime: 1000 * 60,
  })

  const mutation = useMutation({
    mutationFn: async ({ periodo, valor }: { periodo: MetaPeriodo; valor: number }) => {
      // Buscar a configuração atual
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('id, metas_faturamento')
        .eq('tenant_id', tenantId)
        .limit(1)
        .single()

      if (!configData) {
        throw new Error('Nenhuma configuração encontrada. Por favor, acesse Configurações primeiro.')
      }

      const existingMetas = (configData.metas_faturamento || {}) as MetasFaturamentoRaw
      const nextMetas = { ...existingMetas, [periodo]: valor }

      // Atualizar usando o ID do record
      const { error } = await supabase
        .from('configuracoes')
        .update({ metas_faturamento: nextMetas })
        .eq('id', configData.id)
        .eq('tenant_id', tenantId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas-faturamento', tenantId] })
    },
  })

  // Extrair apenas os dados de metas (sem o configId)
  const data = useMemo(() => {
    if (!query.data) return undefined
    const { configId, ...metasData } = query.data
    return metasData as any
  }, [query.data])

  return {
    data,
    isLoading: query.isLoading,
    saveMeta: async (periodo: MetaPeriodo, valor: number) => {
      await mutation.mutateAsync({ periodo, valor })
    },
  }
}

