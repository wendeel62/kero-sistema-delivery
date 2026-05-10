import type { KpiData } from '../../hooks/useDashboardKpis'

interface KpiCardsProps {
  kpiData: KpiData[]
  formatCurrency: (value: number) => string
}

export default function KpiCards({ kpiData, formatCurrency }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-stagger">
      {kpiData.map((kpi, i) => (
        <div
          key={kpi.id}
          className="group p-6 rounded-2xl border border-outline bg-surface-container hover:border-primary/50 hover:bg-surface-container-high shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-smooth animate-fade-in-up"
          style={{ '--i': i } as any}
        >
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center gap-2 flex-1">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${kpi.color === '#d32f2f' ? 'bg-primary/10' : kpi.color === '#ff9800' ? 'bg-secondary/10' : 'bg-surface-variant'}`}>
                <span className="material-symbols-outlined text-lg md:text-xl group-hover:animate-glow" style={{ color: kpi.color }}>
                  {kpi.icon}
                </span>
              </div>
            </div>
            <p className="text-on-surface-variant text-xs md:text-sm uppercase tracking-wide font-medium line-clamp-2 flex-1">{kpi.label}</p>
            <div className="text-xl md:text-2xl font-black truncate" style={{ color: kpi.color }}>
              {kpi.isCurrency ? formatCurrency(kpi.value as number) : kpi.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
