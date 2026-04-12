import { useQueries } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ADMIN_PROJECTS } from '../config/adminProjects'
import type { AdminMetrics } from './useAdminMetrics'

async function fetchProjectMetrics(endpoint: string): Promise<AdminMetrics> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sem sessão ativa')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function useGlobalMetrics() {
  const activeProjects = ADMIN_PROJECTS.filter(p => p.status === 'active')

  const results = useQueries({
    queries: activeProjects.map(project => ({
      queryKey: ['admin-metrics', project.id],
      queryFn: () => fetchProjectMetrics(project.metricsEndpoint),
      staleTime: 30_000,
      retry: 1,
    })),
  })

  const isLoading = results.some(r => r.isLoading)

  const globalMetrics = results.reduce(
    (acc, result) => {
      if (!result.data) return acc
      const d = result.data
      return {
        mrr: acc.mrr + d.revenue.mrr,
        total_orders_today: acc.total_orders_today + d.platform.total_orders_today,
        tenants_total: acc.tenants_total + d.tenants.total,
        tenants_active: acc.tenants_active + d.tenants.active,
        ai_error_rate: acc.ai_error_rate + (d.ai_usage.groq_error_rate_percent + d.ai_usage.gemini_error_rate_percent) / 2,
      }
    },
    { mrr: 0, total_orders_today: 0, tenants_total: 0, tenants_active: 0, ai_error_rate: 0 }
  )

  // Average AI error rate across projects
  if (results.filter(r => r.data).length > 0) {
    globalMetrics.ai_error_rate = globalMetrics.ai_error_rate / results.filter(r => r.data).length
  }

  return { globalMetrics, isLoading }
}
