import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token ausente' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Validar e-mail admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    if (user.email !== adminEmail) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Garantir tabelas auxiliares existam
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid,
          provider text,
          model text,
          tokens_used int,
          status text,
          created_at timestamptz DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS public.error_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid,
          message text,
          context jsonb,
          created_at timestamptz DEFAULT now()
        );
      `
    }).catch(() => null) // Ignorar se exec_sql não existir

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
    const today = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // 4. Consultas de Tenants
    const { data: configs } = await supabaseAdmin
      .from('configuracoes')
      .select('id, status_assinatura, plan_id, plan_value, created_at, next_billing_date, onboarding_completed')

    const allConfigs = configs || []
    const activeConfigs = allConfigs.filter(c => c.status_assinatura === 'active')
    const blockedConfigs = allConfigs.filter(c => c.status_assinatura === 'blocked' || c.status_assinatura === 'bloqueado')
    const canceledConfigs = allConfigs.filter(c => c.status_assinatura === 'canceled' || c.status_assinatura === 'cancelado')
    const newThisMonth = allConfigs.filter(c => c.created_at >= startOfMonth)
    const newLastMonth = allConfigs.filter(c => c.created_at >= startOfLastMonth && c.created_at <= endOfLastMonth)

    // Tenants inativos (sem pedidos nos últimos 7 dias)
    const { data: recentOrders } = await supabaseAdmin
      .from('pedidos')
      .select('tenant_id')
      .gte('created_at', sevenDaysAgo)
    const activeOrderTenants = new Set((recentOrders || []).map(o => o.tenant_id))
    const inactiveTenants = allConfigs.filter(c => !activeOrderTenants.has(c.id))

    const onboardingCompleted = allConfigs.filter(c => c.onboarding_completed === true).length
    const inadimplentes = activeConfigs.filter(c =>
      c.next_billing_date && c.next_billing_date <= threeDaysFromNow
    ).length

    const total = allConfigs.length
    const churnRate = total > 0 ? (canceledConfigs.length / total * 100) : 0

    // 5. Revenue
    const mrr = activeConfigs.reduce((sum, c) => sum + (Number(c.plan_value) || 0), 0)

    const lastMonthConfigs = allConfigs.filter(c =>
      c.created_at <= endOfLastMonth && c.status_assinatura === 'active'
    )
    const mrrLastMonth = lastMonthConfigs.reduce((sum, c) => sum + (Number(c.plan_value) || 0), 0)
    const mrrGrowth = mrrLastMonth > 0 ? ((mrr - mrrLastMonth) / mrrLastMonth * 100) : 0

    // LTV médio
    const avgMonths = allConfigs.length > 0
      ? allConfigs.reduce((sum, c) => {
          const months = (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
          return sum + months
        }, 0) / allConfigs.length
      : 0
    const ltvAvg = avgMonths > 0 && total > 0 ? mrr / total * avgMonths : 0

    // Receita por plano
    const revenueByPlan: Record<string, number> = { basic: 0, pro: 0, premium: 0 }
    activeConfigs.forEach(c => {
      if (c.plan_id && revenueByPlan[c.plan_id] !== undefined) {
        revenueByPlan[c.plan_id] += Number(c.plan_value) || 0
      }
    })

    // 6. Receita hoje
    const { data: pedidosHoje } = await supabaseAdmin
      .from('pedidos')
      .select('total')
      .gte('created_at', today)
      .neq('status', 'cancelado')
    const revenueToday = (pedidosHoje || []).reduce((s, p) => s + Number(p.total || 0), 0)

    // 7. AI Usage
    const { data: aiLogsMonth } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('provider, status, tokens_used, created_at')
      .gte('created_at', startOfMonth)

    const aiLogs = aiLogsMonth || []
    const groqMonth = aiLogs.filter(l => l.provider === 'groq')
    const groqToday = groqMonth.filter(l => l.created_at >= today)
    const groqErrors = groqMonth.filter(l => l.status === 'error')
    const geminiMonth = aiLogs.filter(l => l.provider === 'gemini')
    const geminiToday = geminiMonth.filter(l => l.created_at >= today)
    const geminiErrors = geminiMonth.filter(l => l.status === 'error')

    const groqTokens = groqMonth.reduce((s, l) => s + (l.tokens_used || 0), 0)
    const geminiTokens = geminiMonth.reduce((s, l) => s + (l.tokens_used || 0), 0)

    // 8. Platform metrics
    const { data: todayOrders } = await supabaseAdmin
      .from('pedidos')
      .select('total, canal')
      .gte('created_at', today)
    const { data: monthOrders } = await supabaseAdmin
      .from('pedidos')
      .select('total, canal')
      .gte('created_at', startOfMonth)

    const allTodayOrders = todayOrders || []
    const allMonthOrders = monthOrders || []
    const deliveredOrders = allMonthOrders.filter((p: any) => (p as any).status === 'entregue')
    const avgTicket = deliveredOrders.length > 0
      ? deliveredOrders.reduce((s, p) => s + Number(p.total || 0), 0) / deliveredOrders.length
      : 0

    const canalCount: Record<string, number> = {}
    allMonthOrders.forEach(p => {
      const canal = (p as any).canal || 'desconhecido'
      canalCount[canal] = (canalCount[canal] || 0) + 1
    })
    const topChannel = Object.entries(canalCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

    // 9. Error logs
    const { data: errorLogs } = await supabaseAdmin
      .from('error_logs')
      .select('id, tenant_id, message, context, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    const response = {
      tenants: {
        total,
        active: activeConfigs.length,
        blocked: blockedConfigs.length,
        canceled: canceledConfigs.length,
        churn_rate_percent: Math.round(churnRate * 10) / 10,
        new_this_month: newThisMonth.length,
        new_last_month: newLastMonth.length,
        inactive_7d: inactiveTenants.length,
        onboarding_completed: onboardingCompleted,
        onboarding_total: total,
        inadimplentes_3d: inadimplentes,
      },
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        mrr_last_month: Math.round(mrrLastMonth * 100) / 100,
        mrr_growth_percent: Math.round(mrrGrowth * 10) / 10,
        today: Math.round(revenueToday * 100) / 100,
        ltv_avg: Math.round(ltvAvg * 100) / 100,
        by_plan: revenueByPlan,
      },
      ai_usage: {
        groq_calls_today: groqToday.length,
        groq_calls_month: groqMonth.length,
        groq_errors_month: groqErrors.length,
        groq_error_rate_percent: groqMonth.length > 0 ? Math.round(groqErrors.length / groqMonth.length * 1000) / 10 : 0,
        groq_tokens_month: groqTokens,
        gemini_calls_today: geminiToday.length,
        gemini_calls_month: geminiMonth.length,
        gemini_errors_month: geminiErrors.length,
        gemini_error_rate_percent: geminiMonth.length > 0 ? Math.round(geminiErrors.length / geminiMonth.length * 1000) / 10 : 0,
        gemini_tokens_month: geminiTokens,
      },
      platform: {
        total_orders_today: allTodayOrders.length,
        total_orders_month: allMonthOrders.length,
        avg_ticket_global: Math.round(avgTicket * 100) / 100,
        top_channel: topChannel,
      },
      errors: errorLogs || [],
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('admin-metrics error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
