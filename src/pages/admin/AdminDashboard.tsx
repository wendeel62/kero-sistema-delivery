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
      style={{ background: '#1e2028' }}
    />
  )
}

function KpiCard({
  label,
  value,
  color = '#e5e7eb',
  suffix = '',
  prefix = '',
  growth,
  children,
}: {
  label: string
  value: string | number
  color?: string
  suffix?: string
  prefix?: string
  growth?: number
  children?: React.ReactNode
}) {
  return (
    <div
      className="p-5 rounded-xl border"
      style={{ background: '#12141a', borderColor: '#1e2028' }}
    >
      <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
        {label}
      </p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold" style={{ color, fontFamily: 'Syne, sans-serif' }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{suffix}
        </span>
        {growth !== undefined && (
          <span
            className="flex items-center text-xs mb-1 gap-0.5 font-semibold"
            style={{ color: growth >= 0 ? '#4ade80' : '#f87171' }}
          >
            {growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── GlobalKpiRow ────────────────────────────────────────────────────────────

function GlobalKpiRow() {
  const { globalMetrics, isLoading } = useGlobalMetrics()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6" style={{ background: '#12141a' }}>
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6" style={{ background: '#12141a', borderBottom: '1px solid #1e2028' }}>
      <KpiCard label="MRR Consolidado" value={fmt(globalMetrics.mrr)} color="#4ade80" />
      <KpiCard label="Tenants Ativos" value={globalMetrics.tenants_active} color="#60a5fa" />
      <KpiCard label="Pedidos Hoje" value={num(globalMetrics.total_orders_today)} color="#e8391a" />
      <KpiCard
        label="Taxa de Erro IA"
        value={globalMetrics.ai_error_rate.toFixed(1)}
        suffix="%"
        color={globalMetrics.ai_error_rate > 15 ? '#f87171' : globalMetrics.ai_error_rate > 5 ? '#fbbf24' : '#4ade80'}
      />
    </div>
  )
}

// ─── RevenueByPlanChart ──────────────────────────────────────────────────────

function RevenueByPlanChart({ byPlan, color }: { byPlan: Record<string, number>; color: string }) {
  const plans = [
    { id: 'basic', label: 'Básico', opacity: 1 },
    { id: 'pro', label: 'Pro', opacity: 0.7 },
    { id: 'premium', label: 'Premium', opacity: 0.4 },
  ]
  const max = Math.max(...plans.map(p => byPlan[p.id] || 0), 1)

  return (
    <div className="flex items-end gap-4 h-24 mt-4">
      {plans.map(plan => (
        <div key={plan.id} className="flex flex-col items-center flex-1 gap-1">
          <div className="w-full rounded-t" style={{
            height: `${((byPlan[plan.id] || 0) / max) * 80}px`,
            background: color,
            opacity: plan.opacity,
          }} />
          <span className="text-xs" style={{ color: '#9ca3af' }}>{plan.label}</span>
          <span className="text-xs font-bold" style={{ color }}>
            {fmt(byPlan[plan.id] || 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── AiUsagePanel ───────────────────────────────────────────────────────────

function AiUsagePanel({ aiUsage }: { aiUsage: any }) {
  const providers = [
    { key: 'groq', label: 'Groq' },
    { key: 'gemini', label: 'Gemini' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {providers.map(p => {
        const calls = aiUsage[`${p.key}_calls_month`]
        const callsToday = aiUsage[`${p.key}_calls_today`]
        const tokens = aiUsage[`${p.key}_tokens_month`]
        const errorRate = aiUsage[`${p.key}_error_rate_percent`]
        const isCritical = errorRate > 15
        const isWarning = errorRate > 5

        return (
          <div key={p.key} className="p-5 rounded-xl border" style={{ background: '#12141a', borderColor: '#1e2028' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm" style={{ color: '#e5e7eb' }}>{p.label}</h4>
              {isCritical && (
                <span className="text-xs px-2 py-0.5 rounded font-bold animate-pulse" style={{ background: '#7f1d1d', color: '#f87171' }}>
                  Crítico
                </span>
              )}
              {!isCritical && isWarning && (
                <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: '#78350f', color: '#fbbf24' }}>
                  Atenção
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm" style={{ color: '#9ca3af' }}>
              <div className="flex justify-between">
                <span>Chamadas hoje</span>
                <span style={{ color: '#e5e7eb' }}>{num(callsToday)}</span>
              </div>
              <div className="flex justify-between">
                <span>Chamadas no mês</span>
                <span style={{ color: '#e5e7eb' }}>{num(calls)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tokens no mês</span>
                <span style={{ color: '#e5e7eb' }}>{num(tokens)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Taxa de erro</span>
                <span style={{ color: isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80' }}>
                  {errorRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2028' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(errorRate, 100)}%`, background: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#4ade80' }}
                />
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
      <div className="p-5 rounded-xl border flex flex-col items-center justify-center py-12" style={{ background: '#12141a', borderColor: '#1e2028' }}>
        <div className="text-4xl mb-3">✅</div>
        <p className="text-sm" style={{ color: '#9ca3af' }}>Nenhum erro registrado</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ background: '#12141a', borderColor: '#1e2028' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2028', color: '#6b7280' }}>
              <th className="text-left px-4 py-3">Hora</th>
              <th className="text-left px-4 py-3">Tenant</th>
              <th className="text-left px-4 py-3">Mensagem</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {errors.map((err, i) => (
              <tr key={err.id} style={{ borderBottom: i < errors.length - 1 ? '1px solid #1e2028' : 'none' }}>
                <td className="px-4 py-3" style={{ color: '#9ca3af' }}>
                  {new Date(err.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 font-mono" style={{ color: '#9ca3af', fontSize: 12 }}>
                  {err.tenant_id?.slice(0, 8) || '—'}
                </td>
                <td className="px-4 py-3" style={{ color: '#e5e7eb' }}>
                  <span className="truncate block max-w-xs">{err.message}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedError(err)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: '#1e2028', color: '#9ca3af' }}
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
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSelectedError(null)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            style={{ background: '#12141a', border: '1px solid #1e2028' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold" style={{ color: '#e5e7eb' }}>Detalhes do Erro</h3>
              <button onClick={() => setSelectedError(null)} style={{ color: '#9ca3af' }}>✕</button>
            </div>
            <pre className="text-xs rounded-lg p-4 overflow-auto" style={{ background: '#0e0f14', color: '#e5e7eb', fontFamily: 'monospace' }}>
              {JSON.stringify(selectedError.context, null, 2)
                .replace(/"([^"]+)":/g, (_, k) => `<span style="color:#e8391a">"${k}"</span>:`)
              }
            </pre>
          </div>
        </div>
      )}
    </>
  )
}

// ─── InactiveTenantsAlert ────────────────────────────────────────────────────

function InactiveTenantsAlert({ count }: { count: number }) {
  return (
    <div className="p-5 rounded-xl border h-full" style={{ background: '#12141a', borderColor: '#1e2028' }}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm" style={{ color: '#e5e7eb' }}>Inativos 7 dias</h4>
        {count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: '#7f1d1d', color: '#f87171' }}>
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-sm" style={{ color: '#9ca3af' }}>Nenhum tenant inativo</p>
      ) : (
        <p className="text-sm" style={{ color: '#9ca3af' }}>
          {count} tenant{count > 1 ? 's' : ''} sem pedidos nos últimos 7 dias.
        </p>
      )}
    </div>
  )
}

function InadimplentesAlert({ count }: { count: number }) {
  return (
    <div className="p-5 rounded-xl border h-full" style={{ background: '#12141a', borderColor: '#1e2028' }}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm" style={{ color: '#e5e7eb' }}>Vencendo em 3 dias</h4>
        {count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: '#78350f', color: '#fbbf24' }}>
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-sm" style={{ color: '#9ca3af' }}>Nenhum vencimento próximo</p>
      ) : (
        <p className="text-sm" style={{ color: '#9ca3af' }}>
          {count} tenant{count > 1 ? 's' : ''} com cobrança vencendo em breve.
        </p>
      )}
    </div>
  )
}

// ─── Dashboard Principal ─────────────────────────────────────────────────────

function DashboardContent({ activeProject }: { activeProject: AdminProject | null }) {
  const defaultProject = ADMIN_PROJECTS.find(p => p.status === 'active') || ADMIN_PROJECTS[0]
  const project = activeProject || defaultProject

  const { data, isLoading, isError, error, refetch } = useAdminMetrics(
    project.id,
    project.metricsEndpoint
  )

  const onboarding = data ? Math.round((data.tenants.onboarding_completed / Math.max(data.tenants.onboarding_total, 1)) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: '#0e0f14', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Faixa global */}
      <GlobalKpiRow />

      {isError && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#7f1d1d', color: '#fca5a5' }}>
          ⚠️ Erro ao carregar métricas: {(error as Error)?.message}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Header do projeto */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif', color: '#e5e7eb' }}>
              <span style={{ color: project.color }}>●</span> {project.name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#9ca3af' }}>Métricas específicas</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-80"
            style={{ background: '#1e2028', color: '#9ca3af' }}
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : data ? (
          <>
            {/* KPIs de Tenants */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Tenants</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard label="Ativos" value={data.tenants.active} color="#4ade80" />
                <KpiCard label="Bloqueados" value={data.tenants.blocked} color="#f59e0b" />
                <KpiCard label="Cancelados" value={data.tenants.canceled} color="#ef4444" />
                <KpiCard label="Churn" value={data.tenants.churn_rate_percent} suffix="%" color="#e5e7eb" />
                <KpiCard
                  label="Novos este mês"
                  value={data.tenants.new_this_month}
                  color={data.tenants.new_this_month >= data.tenants.new_last_month ? '#4ade80' : '#f87171'}
                  growth={data.tenants.new_last_month > 0
                    ? ((data.tenants.new_this_month - data.tenants.new_last_month) / data.tenants.new_last_month * 100)
                    : 0}
                />
                <div className="p-5 rounded-xl border" style={{ background: '#12141a', borderColor: '#1e2028' }}>
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>Onboarding</p>
                  <p className="text-2xl font-bold mb-2" style={{ color: '#e5e7eb', fontFamily: 'Syne, sans-serif' }}>
                    {onboarding}%
                  </p>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2028' }}>
                    <div className="h-full rounded-full" style={{ width: `${onboarding}%`, background: project.color }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    {data.tenants.onboarding_completed}/{data.tenants.onboarding_total}
                  </p>
                </div>
              </div>
            </div>

            {/* KPIs de Receita */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Receita</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  label="MRR"
                  value={fmt(data.revenue.mrr)}
                  color="#4ade80"
                  growth={data.revenue.mrr_growth_percent}
                />
                <KpiCard label="Receita Hoje" value={fmt(data.revenue.today)} color="#60a5fa" />
                <KpiCard label="LTV Médio" value={fmt(data.revenue.ltv_avg)} color="#a78bfa" />
              </div>
              <div className="p-5 rounded-xl border mt-4" style={{ background: '#12141a', borderColor: '#1e2028' }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>Receita por Plano</p>
                <RevenueByPlanChart byPlan={data.revenue.by_plan} color={project.color} />
              </div>
            </div>

            {/* Alertas Operacionais */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Alertas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InactiveTenantsAlert count={data.tenants.inactive_7d} />
                <InadimplentesAlert count={data.tenants.inadimplentes_3d} />
              </div>
            </div>

            {/* Pedidos & Canais */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Plataforma</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Pedidos Hoje" value={num(data.platform.total_orders_today)} color="#e8391a" />
                <KpiCard label="Pedidos no Mês" value={num(data.platform.total_orders_month)} color="#e5e7eb" />
                <KpiCard label="Canal Dominante" value={data.platform.top_channel || '—'} color="#9ca3af" />
              </div>
              <div className="mt-4">
                <KpiCard label="Ticket Médio Global" value={fmt(data.platform.avg_ticket_global)} color="#fbbf24" />
              </div>
            </div>

            {/* Uso de IA */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Uso de IA</h3>
              <AiUsagePanel aiUsage={data.ai_usage} />
            </div>

            {/* Erros Recentes */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Erros Recentes</h3>
              <ErrorLogPanel errors={data.errors} />
            </div>
          </>
        ) : null}
      </div>
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
