import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const FORMA_CORES: Record<string, string> = {
  dinheiro: '#22c55e',
  cartao_credito: '#f97316',
  cartao_debito: '#eab308',
  pix: '#3b82f6',
  vale_refeicao: '#a855f7',
  transferencia: '#14b8a6',
}

const FORMA_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
  pix: 'Pix',
  vale_refeicao: 'Vale Refeição',
  transferencia: 'Transferência',
}

interface PaymentDistributionChartProps {
  data: Record<string, number>
}

interface ChartItem {
  name: string
  value: number
  color: string
}

export default function PaymentDistributionChart({ data }: PaymentDistributionChartProps) {
  const chartData: ChartItem[] = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: FORMA_LABELS[key] || key,
      value,
      color: FORMA_CORES[key] || '#6b7280',
    }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatPercent = (value: number) =>
    total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%'

  if (chartData.length === 0) {
    return (
      <div className="bg-surface-container rounded-[2.5rem] p-8 border border-outline min-h-[300px] flex flex-col items-center justify-center text-center shadow-lg">
        <span className="material-symbols-outlined text-5xl opacity-10 mb-4 text-[#ff9800]">pie_chart</span>
        <p className="text-on-surface-variant italic text-sm">Nenhum dado no período</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container rounded-[2.5rem] p-8 border border-outline shadow-lg">
      <h3 className="text-lg font-bold text-on-background mb-6">Distribuição por Forma de Pagamento</h3>
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {chartData.map((item, index) => (
                <Cell key={index} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                const v = Number(value)
                return [`${formatCurrency(v)} (${formatPercent(v)})`, name as string]
              }}
              contentStyle={{
                backgroundColor: '#16181f',
                border: '1px solid #252830',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#9ca3af' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-on-surface-variant">{item.name}</span>
            <span className="text-on-background font-semibold">
              {formatPercent(item.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-outline flex justify-between items-center">
        <span className="text-sm text-on-surface-variant">Total</span>
        <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
