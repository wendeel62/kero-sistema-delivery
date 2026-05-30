import { memo, useMemo } from 'react'

export interface MesaGridPanelProps {
  totalMesas: number
  mesasAtivas: Set<number>
  onMesaClick: (numero: number) => void
  isLoading?: boolean
}

interface MesaCardProps {
  numero: number
  ativa: boolean
  onClick: (numero: number) => void
}

const MesaCard = memo(function MesaCard({ numero, ativa, onClick }: MesaCardProps) {
  return (
    <button
      onClick={() => { if (ativa) onClick(numero) }}
      disabled={!ativa}
      className={`
        aspect-square rounded-2xl border-2 font-headline text-on-surface
        flex flex-col items-center justify-center gap-1
        transition-all duration-200 select-none
        ${ativa
          ? 'bg-red-500/15 border-red-500/50 hover:bg-red-500/25 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/10 cursor-pointer'
          : 'bg-green-500/10 border-green-500/30 cursor-default opacity-80'
        }
      `}
    >
      <span className={`text-3xl sm:text-4xl font-black ${ativa ? 'text-red-400' : 'text-green-400'}`}>
        {numero}
      </span>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${ativa ? 'text-red-400/70' : 'text-green-400/70'}`}>
        {ativa ? 'Ocupada' : 'Livre'}
      </span>
    </button>
  )
})

export const MesaGridPanel = memo(function MesaGridPanel({
  totalMesas,
  mesasAtivas,
  onMesaClick,
  isLoading = false
}: MesaGridPanelProps) {
  const mesaNumeros = useMemo(() => {
    return Array.from({ length: totalMesas }, (_, i) => i + 1)
  }, [totalMesas])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-container border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant">Carregando mesas...</p>
        </div>
      </div>
    )
  }

  if (totalMesas === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">
          table_restaurant
        </span>
        <p className="text-on-surface-variant text-lg">Nenhuma mesa configurada</p>
        <p className="text-on-surface-variant/60 text-sm mt-1">Configure o número de mesas em Configurações</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
      {mesaNumeros.map((num) => (
        <MesaCard
          key={num}
          numero={num}
          ativa={mesasAtivas.has(num)}
          onClick={onMesaClick}
        />
      ))}
    </div>
  )
})
