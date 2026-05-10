import type { Mesa } from '../../hooks/usePdv'

interface MesasGridProps {
  mesas: Mesa[]
  getStatusColor: (status: string) => string
  getTempoOcupada: (abertaEm: string) => string
  onMesaClick: (mesa: Mesa) => void
  onMesaFecharClick: (mesa: Mesa) => void
}

export default function MesasGrid({
  mesas,
  getStatusColor,
  getTempoOcupada,
  onMesaClick,
  onMesaFecharClick
}: MesasGridProps) {
  return (
    <div className="mb-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {mesas.filter(m => m.status !== 'inativa').map(mesa => (
          <div key={mesa.id} className="relative">
            <button
              onClick={() => onMesaClick(mesa)}
              className={`w-full p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${getStatusColor(mesa.status)}`}
            >
              <span className="text-lg sm:text-xl font-bold">{mesa.numero}</span>
              <span className="text-[8px] sm:text-[10px] uppercase">{mesa.status === 'livre' ? 'Livre' : mesa.status === 'ocupada' ? 'Ocupada' : 'Aguardando'}</span>
              {mesa.status === 'ocupada' && mesa.aberta_em && (
                <span className="text-[8px] sm:text-[10px] opacity-70">{getTempoOcupada(mesa.aberta_em)}</span>
              )}
            </button>
            {(mesa.status === 'ocupada' || mesa.status === 'aguardando_pagamento') && (
              <button
                onClick={(e) => { e.stopPropagation(); onMesaFecharClick(mesa) }}
                className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center text-black text-[10px] sm:text-xs font-bold"
                title="Fechar Conta"
              >
                $
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
