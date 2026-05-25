import type { KPIs, FunilRealtimeData } from '../../hooks/useDashboardKpis'

interface FunilVendasProps {
  kpis: KPIs
  funilData: FunilRealtimeData | undefined
  funilSelecionado: string
  showFunilDropdown: boolean
  onFunilSelecionadoChange: (id: string) => void
  onToggleDropdown: () => void
}

export default function FunilVendas({
  kpis,
  funilData,
  funilSelecionado,
  showFunilDropdown,
  onFunilSelecionadoChange,
  onToggleDropdown
}: FunilVendasProps) {
  const funnelItems = [
    { label: 'Visitas Cardápio', value: funilData?.visualizacoes || kpis.funnelData.visualizacoes || kpis.visualizacoes, color: '#d32f2f' },
    { label: 'Adicionado Carrinho', value: funilData?.addCarrinho || kpis.funnelData.addCarrinho, color: '#ff9800' },
    { label: 'Checkout Iniciado', value: funilData?.checkoutIniciado || kpis.funnelData.checkoutIniciado, color: '#ffb74d' },
    { label: 'Compras Feitas', value: funilData?.compras || kpis.funnelData.compras, color: '#4caf50' }
  ]

  const maxValue = Math.max(...funnelItems.map(i => i.value), 1)

  const dropdownOptions = [
    { id: 'todas', label: 'Todas', icon: 'tune' },
    { id: 'visualizacoes', label: 'Visitas Cardápio', icon: 'visibility' },
    { id: 'addCarrinho', label: 'Adicionar Carrinho', icon: 'add_shopping_cart' },
    { id: 'checkout', label: 'Inicio Compras', icon: 'shopping_cart' },
    { id: 'compras', label: 'Compras', icon: 'point_of_sale' }
  ]

  return (
    <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container hover:border-secondary/50 shadow-lg hover:shadow-xl hover:shadow-secondary/20 transition-smooth animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-background">Funil Vendas</h3>
          <p className="text-on-surface-variant text-sm mt-1">Jornada cliente hoje</p>
        </div>
        <div className="relative">
          <button onClick={onToggleDropdown} className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center hover:bg-secondary/20 transition-smooth cursor-pointer">
            <span className="material-symbols-outlined text-secondary text-xl">tune</span>
          </button>
          {showFunilDropdown && (
            <div className="absolute top-14 right-0 w-48 bg-surface-container border border-outline rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
              {dropdownOptions.map((opcao) => (
                <button
                  key={opcao.id}
                  onClick={() => onFunilSelecionadoChange(opcao.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-container-high transition-smooth ${funilSelecionado === opcao.id ? 'bg-primary/10 text-primary' : 'text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-lg">{opcao.icon}</span>
                  <span className="text-sm">{opcao.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {funilSelecionado === 'todas' ? (
          <>
            {funnelItems.map((item, i) => {
              const valorFinal = item.value > 0 ? (item.value / maxValue) * 100 : 0
              return (
                <div key={i} className="flex justify-between items-center group">
                  <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">{item.label}</span>
                  <div className="w-32 h-3 bg-surface-variant rounded-full overflow-hidden group-hover:shadow-lg group-hover:shadow-primary/20">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(valorFinal, item.value > 0 ? 10 : 0)}%`, backgroundColor: item.color }} />
                  </div>
                  <span className="font-bold text-sm" style={{ color: item.color }}>{item.value}</span>
                </div>
              )
            })}
          </>
        ) : (
          <div className="flex justify-between items-center group">
            <span className="text-sm text-on-surface-variant group-hover:text-on-background transition-smooth">
              {funilSelecionado === 'visualizacoes' ? 'Visitas Cardápio' : funilSelecionado === 'addCarrinho' ? 'Adicionar Carrinho' : funilSelecionado === 'checkout' ? 'Início Compras' : 'Compras'}
            </span>
            <span className="text-2xl font-bold text-primary">
              {funilSelecionado === 'visualizacoes' ? (funilData?.visualizacoes || kpis.funnelData.visualizacoes || kpis.visualizacoes || 0) : funilSelecionado === 'addCarrinho' ? (funilData?.addCarrinho || kpis.funnelData.addCarrinho || 0) : funilSelecionado === 'checkout' ? (funilData?.checkoutIniciado || kpis.funnelData.checkoutIniciado || 0) : (funilData?.compras || kpis.funnelData.compras || 0)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
