import { useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useGlobalMetrics } from '../../hooks/useGlobalMetrics'
import { useAdminMetrics } from '../../hooks/useAdminMetrics'
import { ADMIN_PROJECTS, type AdminProject } from '../../config/adminProjects'
import { AdminLayoutWithProject } from '../../components/admin/AdminLayout'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const num = (v: number) => v.toLocaleString('pt-BR')

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: '#1a1c25' }}
    />
  )
}

// ─── GlobalKpiRow ────────────────────────────────────────────────────────────

function GlobalKpiRow() {
  const { globalMetrics, isLoading } = useGlobalMetrics()

  if (isLoading) {
    return (
      <div 
        style={{ 
          background: '#12141a', 
          border: '1px solid #1e2028', 
          borderRadius: '10px', 
          padding: '16px 20px',
        }}
      >
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    )
  }

  const kpis = [
    { label: 'MRR Consolidado', value: fmt(globalMetrics.mrr), color: '#22c55e', sub: 'Mês atual' },
    { label: 'Usuários Ativos', value: num(globalMetrics.tenants_active), color: '#3b82f6', sub: 'Lojas totais' },
    { label: 'Novos Usuários', value: num(globalMetrics.tenants_new_this_month), color: '#f1f5f9', sub: 'Este mês' },
    { 
      label: 'Taxa de Erro IA', 
      value: `${globalMetrics.ai_error_rate.toFixed(1)}%`, 
      color: globalMetrics.ai_error_rate > 15 ? '#ef4444' : globalMetrics.ai_error_rate > 5 ? '#eab308' : '#22c55e',
      sub: 'Média global'
    },
  ]

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-4"
      style={{ 
        background: '#12141a', 
        border: '1px solid #1e2028', 
        borderRadius: '10px', 
        padding: '16px 20px',
      }}
    >
      {kpis.map((kpi, i) => (
        <div 
          key={kpi.label} 
          style={{ 
            borderLeft: i > 0 ? '1px solid #1e2028' : 'none',
            paddingLeft: i > 0 ? '20px' : '0' 
          }}
        >
          <div 
            style={{ 
              fontFamily: 'DM Sans, sans-serif', 
              fontSize: '11px', 
              color: '#4b5563', 
              textTransform: 'uppercase', 
              letterSpacing: '0.6px', 
              marginBottom: '6px' 
            }}
          >
            {kpi.label}
          </div>
          <div 
            style={{ 
              fontFamily: 'Syne, sans-serif', 
              fontWeight: 'bold', 
              fontSize: '22px', 
              color: kpi.color,
              lineHeight: 1,
              marginBottom: '4px'
            }}
          >
            {kpi.value}
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563' }}>
            {kpi.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── KPICARD Base Reutilizável ───────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accentColor,
  meta,
  children,
}: {
  label: string
  value: string | number
  accentColor: string
  meta?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div
      className="transition-all duration-300 hover:-translate-y-1"
      style={{ 
        background: '#12141a', 
        border: '1px solid #1e2028', 
        borderRadius: '10px', 
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accentColor }} />
      <div 
        style={{ 
          fontFamily: 'DM Sans, sans-serif', 
          fontSize: '10px', 
          color: '#4b5563', 
          textTransform: 'uppercase', 
          letterSpacing: '0.6px', 
          marginBottom: '8px'
        }}
      >
        {label}
      </div>
      <div 
        style={{ 
          fontFamily: 'Syne, sans-serif', 
          fontWeight: 'bold', 
          fontSize: '24px', 
          color: accentColor,
          lineHeight: 1,
          marginBottom: meta || children ? '8px' : '0' 
        }}
      >
        {value}
      </div>
      {meta && (
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563' }}>
          {meta}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── RevenueByPlanChart ──────────────────────────────────────────────────────

function RevenueByPlanChart({ byPlan }: { byPlan: Record<string, number> }) {
  const plans = [
    { id: 'basic', label: 'Básico', opacity: 1 },
    { id: 'pro', label: 'Pro', opacity: 0.7 },
    { id: 'premium', label: 'Premium', opacity: 0.4 },
  ]
  const max = Math.max(...plans.map(p => byPlan[p.id] || 0), 1)

  return (
    <div className="flex items-end gap-2" style={{ height: '60px' }}>
      {plans.map(plan => {
        const heightPercent = Math.max((byPlan[plan.id] || 0) / max * 100, (byPlan[plan.id] || 0) > 0 ? 8 : 0)
        return (
          <div key={plan.id} className="flex flex-col items-center flex-1 justify-end gap-1 h-full">
            <div 
              style={{
                height: `${heightPercent}%`,
                width: '100%',
                background: '#e8391a',
                opacity: plan.opacity,
                borderRadius: '4px 4px 0 0',
              }} 
            />
            <div className="flex flex-col items-center" style={{ marginTop: '4px' }}>
               <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#6b7280' }}>
                 {plan.label}
               </span>
               <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#e8391a' }}>
                 {fmt(byPlan[plan.id] || 0)}
               </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── AiUsagePanel ───────────────────────────────────────────────────────────

function AiUsagePanel({ aiUsage }: { aiUsage: any }) {
  const providers = [
    { 
      key: 'groq', 
      label: 'Groq', 
      model: 'LLaMA 3.1', 
      iconBg: '#1a2a1a', 
      iconColor: '#22c55e', 
      iconChar: 'G' 
    },
    { 
      key: 'gemini', 
      label: 'Gemini', 
      model: 'Flash 2.0', 
      iconBg: '#1a1a2e', 
      iconColor: '#818cf8', 
      iconChar: '✦' 
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
      {providers.map(p => {
        const calls = aiUsage[`${p.key}_calls_month`]
        const callsToday = aiUsage[`${p.key}_calls_today`]
        const tokens = aiUsage[`${p.key}_tokens_month`]
        const errorRate = aiUsage[`${p.key}_error_rate_percent`] || 0
        const isCritical = errorRate > 15
        const isWarning = errorRate > 5

        return (
          <div 
            key={p.key} 
            className="transition-all duration-300 hover:-translate-y-1"
            style={{ 
              background: '#12141a', 
              border: '1px solid #1e2028', 
              borderRadius: '10px', 
              padding: '18px 20px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center justify-center"
                  style={{ 
                    width: '28px', height: '28px', borderRadius: '6px', 
                    background: p.iconBg, color: p.iconColor, 
                    fontWeight: 'bold', fontSize: '14px' 
                  }}
                >
                  {p.iconChar}
                </div>
                <div>
                   <h4 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                     {p.label}
                   </h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCritical && (
                  <span 
                    className="animate-pulse flex items-center justify-center" 
                    style={{ background: '#7f1d1d', color: '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 'bold', borderRadius: '20px', padding: '2px 8px' }}
                  >
                    Crítico
                  </span>
                )}
                {!isCritical && isWarning && (
                  <span 
                    className="flex items-center justify-center" 
                    style={{ background: '#78350f', color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 'bold', borderRadius: '20px', padding: '2px 8px' }}
                  >
                    Atenção
                  </span>
                )}
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563' }}>
                  {p.model}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              {[
                { k: 'Chamadas hoje', v: num(callsToday) },
                { k: 'Chamadas no mês', v: num(calls) },
                { k: 'Tokens no mês', v: num(tokens) },
              ].map((row, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center" 
                  style={{ 
                    padding: '6px 0', 
                    borderBottom: '1px solid #1e2028',
                  }}
                >
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}>
                    {row.k}
                  </span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
                    {row.v}
                  </span>
                </div>
              ))}

              <div 
                className="flex flex-col justify-center" 
                style={{ padding: '6px 0' }}
              >
                <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}>
                    Taxa de erro
                  </span>
                  <span 
                    style={{ 
                      fontFamily: 'DM Sans, sans-serif', 
                      fontSize: '12px', 
                      fontWeight: 500, 
                      color: isCritical ? '#ef4444' : isWarning ? '#eab308' : '#22c55e'
                    }}
                  >
                    {errorRate.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: '#1e2028', overflow: 'hidden' }}>
                  <div
                    style={{ 
                      height: '100%', 
                      width: `${Math.min(errorRate, 100)}%`, 
                      background: isCritical ? '#ef4444' : isWarning ? '#eab308' : '#22c55e' 
                    }}
                  />
                </div>
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── ErrorLogPanel ──────────────────────────────────────────────────────────

function ErrorLogPanel({ errors }: { errors: any[] }) {
  const [selectedError, setSelectedError] = useState<any>(null)

  if (!errors.length) {
    return (
      <div 
        className="w-full flex flex-col items-center justify-center" 
        style={{ 
          background: '#12141a', 
          border: '1px solid #1e2028', 
          borderRadius: '10px', 
          padding: '40px 20px',
        }}
      >
        <div 
          className="flex items-center justify-center mb-3"
          style={{ width: '36px', height: '36px', background: '#052e16', border: '1px solid #166534', borderRadius: '50%', color: '#22c55e', fontSize: '18px' }}
        >
          ✓
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#4b5563' }}>
          Nenhum erro registrado
        </p>
      </div>
    )
  }

  return (
    <>
      <div 
        className="w-full overflow-hidden" 
        style={{ background: '#12141a', border: '1px solid #1e2028', borderRadius: '10px', padding: '18px 20px' }}
      >
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '12px', fontWeight: 'normal' }}>Hora</th>
              <th style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '12px', fontWeight: 'normal' }}>Usuário</th>
              <th style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '12px', fontWeight: 'normal' }}>Mensagem</th>
              <th style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '12px', fontWeight: 'normal' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((err, i) => (
              <tr key={err.id}>
                <td style={{ borderBottom: i < errors.length - 1 ? '1px solid #1e2028' : 'none', padding: '12px 0', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}>
                  {new Date(err.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ borderBottom: i < errors.length - 1 ? '1px solid #1e2028' : 'none', padding: '12px 0', fontFamily: 'monospace', fontSize: '12px', color: '#9ca3af' }}>
                  {err.tenant_id?.slice(0, 8) || '—'}
                </td>
                <td style={{ borderBottom: i < errors.length - 1 ? '1px solid #1e2028' : 'none', padding: '12px 0', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#e2e8f0', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {err.message}
                </td>
                <td style={{ borderBottom: i < errors.length - 1 ? '1px solid #1e2028' : 'none', padding: '12px 0' }}>
                  <button
                    onClick={() => setSelectedError(err)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#3b82f6', padding: 0 }}
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedError && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setSelectedError(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            style={{ background: '#0a0b0f', borderRadius: '8px', padding: '16px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Contexto Interno</h3>
              <button onClick={() => setSelectedError(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            </div>
            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', overflow: 'auto' }}>
              {JSON.stringify(selectedError.context, null, 2)
                .replace(/"([^"]+)":/g, (_, k) => `<span style="color:#e8391a">"${k}"</span>:`)
                .replace(/: "([^"]+)"/g, (_, v) => `: <span style="color:#4ade80">"${v}"</span>`)
                .replace(/: (\d+)/g, (_, n) => `: <span style="color:#60a5fa">${n}</span>`)
              }
            </pre>
          </div>
        </div>
      )}
    </>
  )
}

// ─── AlertasOperacionais ────────────────────────────────────────────────────

function InactiveTenantsAlert({ count }: { count: number }) {
  if (count === 0) {
    return (
      <div 
        className="w-full flex flex-col items-center justify-center p-4 transition-all duration-300 hover:-translate-y-1" 
        style={{ 
          background: '#12141a', 
          border: '1px solid #1e2028', 
          borderRadius: '10px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        }}
      >
        <div 
          className="flex items-center justify-center mb-3"
          style={{ width: '36px', height: '36px', background: '#052e16', border: '1px solid #166534', borderRadius: '50%', color: '#22c55e', fontSize: '18px' }}
        >
          ✓
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#4b5563' }}>
          Nenhum usuário inativo
        </p>
      </div>
    )
  }

  return (
    <div 
       className="transition-all duration-300 hover:-translate-y-1"
       style={{ background: '#12141a', border: '1px solid #1e2028', borderRadius: '10px', padding: '16px 20px', height: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Inativos Totais</h4>
        <div style={{ background: '#7f1d1d', color: '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 'bold', borderRadius: '20px', padding: '2px 8px' }}>
          {count}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between" style={{ padding: '7px 0' }}>
            <div>
               <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#e2e8f0' }}>
                 Vários Lojistas
               </div>
               <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563' }}>
                 Sem pedidos recentes
               </div>
            </div>
            <div style={{ background: '#1c0a0a', color: '#ef4444', border: '1px solid #7f1d1d', fontFamily: 'DM Sans, sans-serif', fontSize: '10px', borderRadius: '4px', padding: '2px 8px' }}>
              Inativo
            </div>
        </div>
      </div>
    </div>
  )
}

function InadimplentesAlert({ count }: { count: number }) {
  if (count === 0) {
    return (
      <div 
        className="w-full flex flex-col items-center justify-center p-4 transition-all duration-300 hover:-translate-y-1" 
        style={{ 
          background: '#12141a', 
          border: '1px solid #1e2028', 
          borderRadius: '10px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        }}
      >
        <div 
          className="flex items-center justify-center mb-3"
          style={{ width: '36px', height: '36px', background: '#052e16', border: '1px solid #166534', borderRadius: '50%', color: '#22c55e', fontSize: '18px' }}
        >
          ✓
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#4b5563' }}>
          Nenhum vencimento próximo
        </p>
      </div>
    )
  }

  return (
    <div 
       className="transition-all duration-300 hover:-translate-y-1"
       style={{ background: '#12141a', border: '1px solid #1e2028', borderRadius: '10px', padding: '16px 20px', height: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Vencimentos</h4>
        <div style={{ background: '#78350f', color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 'bold', borderRadius: '20px', padding: '2px 8px' }}>
          {count}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between" style={{ padding: '7px 0' }}>
            <div>
               <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#e2e8f0' }}>
                 Vários Lojistas
               </div>
               <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563' }}>
                 Assinatura expirando
               </div>
            </div>
            <div style={{ background: '#1c1400', color: '#eab308', border: '1px solid #78350f', fontFamily: 'DM Sans, sans-serif', fontSize: '10px', borderRadius: '4px', padding: '2px 8px' }}>
              Vencendo
            </div>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Principal ─────────────────────────────────────────────────────

function DashboardContent({ activeProject }: { activeProject: AdminProject | null }) {
  const defaultProject = ADMIN_PROJECTS.find(p => p.status === 'active') || ADMIN_PROJECTS[0]
  const project = activeProject || defaultProject

  const { data, isLoading, isError, error } = useAdminMetrics(
    project.id,
    project.metricsEndpoint
  )

  const onboarding = data ? Math.round((data.tenants.onboarding_completed / Math.max(data.tenants.onboarding_total, 1)) * 100) : 0

  return (
    <div className="min-h-full flex flex-col gap-[24px]">
      
      {/* Faixa global */}
      <div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
          Visão Consolidada
        </div>
        <GlobalKpiRow />
      </div>

      {isError && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
          ⚠️ Erro ao carregar métricas: {(error as Error)?.message}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : data ? (
        <>
          {/* Tenants Grid 6 cols */}
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              Ecossistema SaaS
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[10px]">
              <KpiCard label="Ativos" value={data.tenants.active} accentColor="#22c55e" />
              <KpiCard label="Bloqueados" value={data.tenants.blocked} accentColor="#eab308" />
              <KpiCard label="Cancelados" value={data.tenants.canceled} accentColor="#ef4444" />
              <KpiCard label="Churn Rate" value={`${data.tenants.churn_rate_percent}%`} accentColor="#374151" />
              <KpiCard
                label="Novos este mês"
                value={data.tenants.new_this_month}
                accentColor="#3b82f6"
                meta={
                  data.tenants.new_last_month > 0 ? (
                    <span style={{ color: data.tenants.new_this_month >= data.tenants.new_last_month ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                      {data.tenants.new_this_month >= data.tenants.new_last_month ? '▲' : '▼'} {Math.abs(((data.tenants.new_this_month - data.tenants.new_last_month) / data.tenants.new_last_month) * 100).toFixed(1)}% vs anterior
                    </span>
                  ) : null
                }
              />
              <KpiCard label="Onboarding" value={`${onboarding}%`} accentColor="#f97316">
                 <div style={{ marginTop: '8px' }}>
                    <div style={{ height: '3px', background: '#1e2028', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#e8391a', width: `${onboarding}%` }} />
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>
                       {data.tenants.onboarding_completed}/{data.tenants.onboarding_total} concluídos
                    </div>
                 </div>
              </KpiCard>
            </div>
          </div>

          {/* Receita (3 cards + barra) */}
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              Performance Financeira
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
               <div className="transition-all duration-300 hover:-translate-y-1" style={{ background: '#12141a', border: '1px solid #1e2028', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                 <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>MRR</div>
                 <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 'bold', fontSize: '28px', color: '#22c55e' }}>{fmt(data.revenue.mrr)}</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: data.revenue.mrr_growth_percent >= 0 ? '#22c55e' : '#ef4444' }}>
                      {data.revenue.mrr_growth_percent >= 0 ? '▲' : '▼'} {Math.abs(data.revenue.mrr_growth_percent).toFixed(1)}%
                    </span>
                 </div>
               </div>
               <div className="transition-all duration-300 hover:-translate-y-1" style={{ background: '#12141a', border: '1px solid #1e2028', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                 <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Receita Hoje</div>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 'bold', fontSize: '28px', color: '#3b82f6' }}>{fmt(data.revenue.today)}</div>
               </div>
               <div className="transition-all duration-300 hover:-translate-y-1" style={{ background: '#12141a', border: '1px solid #1e2028', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                 <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>LTV Médio</div>
                 <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 'bold', fontSize: '28px', color: '#a78bfa' }}>{fmt(data.revenue.ltv_avg)}</div>
               </div>
            </div>
            
            <div className="transition-all duration-300 hover:-translate-y-1" style={{ background: '#12141a', border: '1px solid #1e2028', borderRadius: '10px', padding: '18px 20px', marginTop: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>Receita por Plano</div>
              <RevenueByPlanChart byPlan={data.revenue.by_plan} />
            </div>
          </div>

          {/* Alertas Operacionais */}
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              Alertas Operacionais
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
              <InactiveTenantsAlert count={data.tenants.inactive_7d} />
              <InadimplentesAlert count={data.tenants.inadimplentes_3d} />
            </div>
          </div>

          {/* Uso de IA */}
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              Acesso e Status IA
            </div>
            <AiUsagePanel aiUsage={data.ai_usage} />
          </div>

          {/* Erros Recentes */}
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              Logs de Interrupção
            </div>
            <ErrorLogPanel errors={data.errors} />
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <AdminLayoutWithProject
      render={(activeProject) => <DashboardContent activeProject={activeProject} />}
    />
  )
}
