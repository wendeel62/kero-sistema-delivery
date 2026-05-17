import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ReceitaData } from '../../hooks/useDashboardKpis'

interface ReceitaChartProps {
  receitaData: ReceitaData | undefined
  receitaDias: number
  showReceitaDropdown: boolean
  formatCurrency: (value: number) => string
  onToggleDropdown: () => void
  onSelectDias: (dias: number) => void
}

interface ChartData {
  dia: string
  valor: number
}

export default function ReceitaChart({
  receitaData,
  receitaDias,
  showReceitaDropdown,
  formatCurrency,
  onToggleDropdown,
  onSelectDias
}: ReceitaChartProps) {
  const chartData: ChartData[] = receitaData?.receitaPorDia?.map((valor: number, i: number) => ({
    dia: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][6 - i],
    valor
  })).reverse() || []

  return (
    <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-primary/50 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-smooth animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-background">Receita {receitaDias} Dias</h3>
          <p className="text-on-surface-variant text-sm mt-1">Vendas diárias</p>
        </div>
        <div className="relative">
          <button onClick={onToggleDropdown} className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center hover:bg-primary/20 transition-smooth cursor-pointer">
            <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
          </button>
          {showReceitaDropdown && (
            <div className="absolute top-14 right-0 w-36 bg-surface-container border border-outline rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
              {[{ dias: 7, label: '7 Dias' }, { dias: 15, label: '15 Dias' }, { dias: 30, label: '30 Dias' }].map((opcao) => (
                <button
                  key={opcao.dias}
                  onClick={() => onSelectDias(opcao.dias)}
                  className={`w-full px-4 py-3 text-left hover:bg-surface-container-high transition-smooth ${receitaDias === opcao.dias ? 'bg-primary/10 text-primary' : 'text-on-surface'}`}
                >
                  <span className="text-sm">{opcao.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-end justify-between gap-1 h-32">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData}>
            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Receita']} contentStyle={{ backgroundColor: '#16181f', border: '1px solid #252830', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
            <Bar dataKey="valor" fill="#e8391a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-on-surface-variant">-{receitaDias}d</span>
        <span className="text-xs text-on-surface-variant">Hoje</span>
      </div>
      <div className="mt-4 pt-4 border-t border-outline flex justify-between items-center">
        <span className="text-sm text-on-surface-variant">Total {receitaDias} dias</span>
        <span className="text-lg font-bold text-primary">{formatCurrency(receitaData?.totalReceita || 0)}</span>
      </div>
    </div>
  )
}
