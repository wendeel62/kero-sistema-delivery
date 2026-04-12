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
      console.error('[AdminMetrics] Erro Auth API:', authError)
      return new Response(JSON.stringify({ error: 'Token inválido', details: authError?.message }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Validar e-mail admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    console.log(`[AdminMetrics] User logado: ${user.email}, Admin esperado: ${adminEmail}`)
    
    if (user.email !== adminEmail) {
      console.warn('[AdminMetrics] Acesso negado: Mismatch de e-mail')
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[AdminMetrics] Acesso autorizado. Iniciando consultas...')

    // 3. Garantir tabelas auxiliares existam
    try {
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
      })
    } catch (e) {
      console.warn('[AdminMetrics] Falha ao executar exec_sql (não crítico se tabelas já existirem):', e.message)
    }

    const now = new Date()
    // ... resto do código igual ...
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
    const today = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // 4. Consultas de Tenants
    console.log('[AdminMetrics] Consultando configuracoes...')
    const { data: configs, error: configError } = await supabaseAdmin
      .from('configuracoes')
      .select('id, created_at')
    
    if (configError) throw new Error(`Erro configuracoes: ${configError.message}`)

    const allConfigs = configs || []
    const activeConfigs = allConfigs
    const blockedConfigs = []
    const canceledConfigs = []
    const newThisMonth = allConfigs.filter(c => c.created_at >= startOfMonth)
    const newLastMonth = allConfigs.filter(c => c.created_at >= startOfLastMonth && c.created_at <= endOfLastMonth)

    // Tenants inativos (sem pedidos nos últimos 7 dias)
    console.log('[AdminMetrics] Consultando pedidos recentes...')
    const { data: recentOrders, error: ordersError } = await supabaseAdmin
      .from('pedidos')
      .select('tenant_id')
      .gte('created_at', sevenDaysAgo)
    
    if (ordersError) throw new Error(`Erro pedidos: ${ordersError.message}`)

    const activeOrderTenants = new Set((recentOrders || []).map(o => o.tenant_id))
    const inactiveTenants = allConfigs.filter(c => !activeOrderTenants.has(c.id))

    const onboardingCompleted = allConfigs.length
    const inadimplentes = 0

    const total = allConfigs.length
    const churnRate = 0

    // 5. Revenue
    const mrr = 0

    const lastMonthConfigs = allConfigs.filter(c => c.created_at <= endOfLastMonth)
    const mrrLastMonth = 0
    const mrrGrowth = 0

    // LTV médio
    const avgMonths = allConfigs.length > 0
      ? allConfigs.reduce((sum, c) => {
          const months = (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
          return sum + months
        }, 0) / allConfigs.length
      : 0
    const ltvAvg = 0

    // Receita por plano
    const revenueByPlan: Record<string, number> = { basic: 0, pro: 0, premium: 0 }

    // 6. Receita hoje
    const { data: pedidosHoje, error: hojeError } = await supabaseAdmin
      .from('pedidos')
      .select('total')
      .gte('created_at', today)
      .neq('status', 'cancelado')
    
    if (hojeError) throw new Error(`Erro pedidos hoje: ${hojeError.message}`)

    const revenueToday = (pedidosHoje || []).reduce((s, p) => s + Number(p.total || 0), 0)

    // 7. AI Usage
    console.log('[AdminMetrics] Consultando AI logs...')
    const { data: aiLogsMonth, error: aiError } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('provider, status, tokens_used, created_at')
      .gte('created_at', startOfMonth)
    
    if (aiError) console.warn('[AdminMetrics] Erro ao carregar AI logs (tabela pode estar vazia):', aiError.message)

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
    const { data: errorLogs, error: logErrors } = await supabaseAdmin
      .from('error_logs')
      .select('id, tenant_id, message, context, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (logErrors) console.warn('[AdminMetrics] Erro ao carregar logs de erro:', logErrors.message)

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

    console.log('[AdminMetrics] Resposta pronta. Status 200.')
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[AdminMetrics] ERRO FATAL:', err.message)
    return new Response(JSON.stringify({ 
      error: 'Erro interno no servidor', 
      message: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
