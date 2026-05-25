import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface PicosChartProps {
  pedidosPorHora: number[]
  totalPedidos: number
}

export default function PicosChart({ pedidosPorHora, totalPedidos }: PicosChartProps) {
  return (
    <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-secondary/50 shadow-lg hover:shadow-xl hover:shadow-secondary/20 transition-smooth animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-background">Picos Hora</h3>
          <p className="text-on-surface-variant text-sm mt-1">Hoje</p>
        </div>
        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary text-xl">insights</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={pedidosPorHora.map((count, hour) => ({ hora: `${hour}h`, pedidos: count }))}>
          <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value: any, _name: any) => [`${value} pedidos`, 'Qtd']} contentStyle={{ backgroundColor: '#16181f', border: '1px solid #252830', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
          <Area type="monotone" dataKey="pedidos" fill="#f57c24" fillOpacity={0.2} stroke="#f57c24" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-6 pt-4 border-t border-outline flex justify-between">
        <span className="text-sm text-on-surface-variant">Total hoje</span>
        <span className="text-lg font-bold text-primary">{totalPedidos}</span>
      </div>
    </div>
  )
}
