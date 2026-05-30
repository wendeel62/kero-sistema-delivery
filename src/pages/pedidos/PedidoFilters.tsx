import { memo } from 'react'
import type { FiltroData } from './usePedidosFilters'

export interface PedidoFiltersProps {
  filtroData: FiltroData
  dataInicio: string
  dataFim: string
  showFiltroPersonalizado: boolean
  busca: string
  onSetFiltroData: (filtro: FiltroData) => void
  onSetDataInicio: (data: string) => void
  onSetDataFim: (data: string) => void
  onSetShowFiltroPersonalizado: (show: boolean) => void
  onSetBusca: (busca: string) => void
  onClear?: () => void
}

const FILTROS = [
  { id: 'hoje', label: 'Hoje', icon: 'today' },
  { id: 'ontem', label: 'Ontem', icon: 'history' },
  { id: 'semana', label: '7 Dias', icon: 'date_range' },
  { id: 'mes', label: 'Mês', icon: 'calendar_month' },
  { id: 'personalizado', label: 'Personalizado', icon: 'tune' }
] as const

export const PedidoFilters = memo(function PedidoFilters({
  filtroData,
  dataInicio,
  dataFim,
  showFiltroPersonalizado,
  busca,
  onSetFiltroData,
  onSetDataInicio,
  onSetDataFim,
  onSetShowFiltroPersonalizado,
  onSetBusca,
  onClear
}: PedidoFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Barra de Busca */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
          search
        </span>
        <input
          type="text"
          value={busca}
          onChange={(e) => onSetBusca(e.target.value)}
          placeholder="Buscar por cliente, telefone ou número..."
          className="w-full bg-surface-dim border border-outline rounded-xl py-3 pl-10 pr-4 text-sm text-on-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        {busca && (
          <button
            onClick={() => onSetBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Filtros de Data */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {FILTROS.map((btn) => (
          <button
            key={btn.id}
            onClick={() => {
              if (btn.id === 'personalizado') {
                onSetShowFiltroPersonalizado(true)
              } else {
                onSetFiltroData(btn.id as FiltroData)
                onSetShowFiltroPersonalizado(false)
              }
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border hover:scale-105 active:scale-95 ${
              filtroData === btn.id
                ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/10'
                : 'bg-surface-container border-outline text-on-surface-variant hover:bg-surface-container-high hover:text-on-background'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{btn.icon}</span>
            <span className="hidden sm:inline">{btn.label}</span>
            <span className="sm:hidden">
              {btn.id === 'personalizado' ? 'Filtro' : btn.label}
            </span>
          </button>
        ))}
      </div>

      {/* Modal Filtro Personalizado */}
      {showFiltroPersonalizado && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => onSetShowFiltroPersonalizado(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') onSetShowFiltroPersonalizado(false) }}
          role="button"
          tabIndex={0}
        >
          <div
            className="bg-surface-container p-5 sm:p-6 rounded-2xl w-full max-w-md border border-outline flex flex-col gap-5 sm:gap-6 animate-fade-in-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-on-background flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">date_range</span>
                Filtro Personalizado
              </h2>
              <button
                onClick={() => onSetShowFiltroPersonalizado(false)}
                className="w-8 h-8 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="filtro-data-inicio" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Data Início
                </label>
                <input
                  id="filtro-data-inicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => onSetDataInicio(e.target.value)}
                  className="w-full bg-surface-dim rounded-xl p-3 text-sm text-on-background border border-outline outline-none focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="filtro-data-fim" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Data Fim
                </label>
                <input
                  id="filtro-data-fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => onSetDataFim(e.target.value)}
                  className="w-full bg-surface-dim rounded-xl p-3 text-sm text-on-background border border-outline outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  onSetDataInicio('')
                  onSetDataFim('')
                  onSetShowFiltroPersonalizado(false)
                  onClear?.()
                }}
                className="flex-1 py-3 rounded-xl border border-outline text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={() => {
                  onSetFiltroData('personalizado')
                  onSetShowFiltroPersonalizado(false)
                }}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-bright text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
              >
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
