import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AdminMetrics {
  tenants: {
    total: number
    active: number
    blocked: number
    canceled: number
    churn_rate_percent: number
    new_this_month: number
    new_last_month: number
    inactive_7d: number
    onboarding_completed: number
    onboarding_total: number
    inadimplentes_3d: number
  }
  revenue: {
    mrr: number
    mrr_last_month: number
    mrr_growth_percent: number
    today: number
    ltv_avg: number
    by_plan: Record<string, number>
  }
  ai_usage: {
    groq_calls_today: number
    groq_calls_month: number
    groq_errors_month: number
    groq_error_rate_percent: number
    groq_tokens_month: number
    gemini_calls_today: number
    gemini_calls_month: number
    gemini_errors_month: number
    gemini_error_rate_percent: number
    gemini_tokens_month: number
  }
  platform: {
    total_orders_today: number
    total_orders_month: number
    avg_ticket_global: number
    top_channel: string
  }
  errors: Array<{
    id: string
    tenant_id: string
    message: string
    context: Record<string, unknown>
    created_at: string
  }>
}

async function fetchAdminMetrics(endpoint: string): Promise<AdminMetrics> {
  const { data, error } = await supabase.functions.invoke(endpoint)

  if (error) {
    console.error(`[AdminMetrics] Erro ao invocar ${endpoint}:`, error)
    throw new Error(error.message || 'Erro ao carregar métricas da Edge Function')
  }

  return data as AdminMetrics
}

export function useAdminMetrics(projectId: string, endpoint: string) {
  return useQuery({
    queryKey: ['admin-metrics', projectId],
    queryFn: () => fetchAdminMetrics(endpoint),
    staleTime: 30_000,
    retry: 1,
  })
}
