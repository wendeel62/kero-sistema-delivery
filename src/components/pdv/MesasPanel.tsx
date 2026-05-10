import type { Mesa } from '../../hooks/usePdv'

interface MesasPanelProps {
  showMesasPanel: boolean
  mesas: Mesa[]
  mesasComItens: Record<string, any[]>
  mesaExpandida: string | null
  getTempoOcupada: (abertaEm: string) => string
  onClose: () => void
  onExpandMesa: (id: string | null) => void
  onFecharMesa: (mesa: Mesa, itens: any[]) => void
}

export default function MesasPanel({
  showMesasPanel,
  mesas,
  mesasComItens,
  mesaExpandida,
  getTempoOcupada,
  onClose,
  onExpandMesa,
  onFecharMesa
}: MesasPanelProps) {
  if (!showMesasPanel) return null

  const mesasOcupadas = mesas.filter(m => m.status === 'ocupada' || m.status === 'aguardando_pagamento')

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-[#252830] shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#252830] flex justify-between items-center">
          <div>
            <h3 className="font-[Outfit] text-lg sm:text-xl font-bold text-white">Mesas Abertas</h3>
            <p className="text-xs text-gray-500 mt-0.5">{mesasOcupadas.length} mesa(s) em uso</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#252830] flex items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Lista de mesas */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {mesasOcupadas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 block">table_restaurant</span>
              <p className="text-sm">Nenhuma mesa aberta</p>
            </div>
          ) : (
            mesasOcupadas.map(mesa => {
              const itensDestaMesa = mesasComItens[mesa.id] || []
              const totalMesa = itensDestaMesa.reduce((sum, item) => sum + (item.total || 0), 0)
              const expandida = mesaExpandida === mesa.id

              return (
                <div key={mesa.id} className="bg-[#252830] rounded-xl border border-[#353840] overflow-hidden">
                  <button onClick={() => onExpandMesa(expandida ? null : mesa.id)} className="w-full p-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e8391a]/10 border border-[#e8391a]/30 flex items-center justify-center">
                        <span className="text-[#e8391a] font-black text-sm">{mesa.numero}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Mesa {mesa.numero}</p>
                        <p className="text-gray-400 text-xs">
                          {mesa.responsavel ? mesa.responsavel : `${mesa.pessoas || 0} pessoa(s)`}
                          {mesa.aberta_em ? ` · ${getTempoOcupada(mesa.aberta_em)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#e8391a] font-bold text-sm">{totalMesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <span className="material-symbols-outlined text-gray-400 text-sm transition-transform" style={{ transform: expandida ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                    </div>
                  </button>

                  {expandida && (
                    <div className="border-t border-[#353840] p-4 space-y-3">
                      <div className="space-y-1.5">
                        {itensDestaMesa.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-2">Nenhum item registrado</p>
                        ) : (
                          itensDestaMesa.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-gray-300">{item.quantidade}x {item.produto_nome}</span>
                              <span className="text-gray-400 font-bold">{Number(item.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#353840]">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</span>
                        <span className="text-[#e8391a] font-black">{totalMesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <button onClick={() => onFecharMesa(mesa, itensDestaMesa)} className="w-full py-3 rounded-xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                        Fechar Conta
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
