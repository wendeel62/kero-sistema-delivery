import type { TemposMedios } from '../../hooks/useDashboardKpis'

interface TempoPedidosProps {
  temposMedios: TemposMedios
  tempoEntrega: number
}

export default function TempoPedidos({ temposMedios, tempoEntrega }: TempoPedidosProps) {
  const items = [
    { label: 'Novo → Prep', value: temposMedios.novo, color: '#2196f3' },
    { label: 'Preparo', value: temposMedios.preparo, color: '#ff9800' },
    { label: 'Entrega', value: temposMedios.entrega, color: '#9c27b0' }
  ]

  return (
    <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-secondary/50 shadow-lg hover:shadow-xl hover:shadow-secondary/20 transition-smooth animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-background">Tempo por Pedido</h3>
          <p className="text-on-surface-variant text-sm mt-1">Média hoje</p>
        </div>
        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary text-xl">access_time</span>
        </div>
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110 ${item.color === '#ff9800' ? 'bg-secondary/10' : 'bg-surface-variant'}`}>
                <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>schedule</span>
              </div>
              <p className="text-on-surface text-sm font-medium group-hover:text-on-background">{item.label}</p>
            </div>
            <span className="text-lg font-bold" style={{ color: item.color }}>{item.value} min</span>
          </div>
        ))}
        <div className="pt-4 mt-4 border-t border-outline">
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant text-sm">Total Médio</span>
            <span className="text-2xl font-black text-primary">{tempoEntrega} min</span>
          </div>
        </div>
      </div>
    </div>
  )
}
