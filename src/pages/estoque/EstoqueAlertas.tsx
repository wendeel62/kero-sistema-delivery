import { memo } from 'react'
import type { Ingrediente } from './types'

export interface EstoqueAlertasProps {
  ingredientes: Ingrediente[]
  onRepor?: (ingrediente: Ingrediente) => void
}

export const EstoqueAlertas = memo(function EstoqueAlertas({
  ingredientes,
  onRepor
}: EstoqueAlertasProps) {
  const criticos = ingredientes.filter(i => i.estoque_atual <= i.estoque_critico)
  const baixos = ingredientes.filter(i => i.estoque_atual > i.estoque_critico && i.estoque_atual <= i.estoque_minimo)
  const vencendo = ingredientes.filter(i => {
    if (!i.validade) return false
    const now = new Date()
    const validade = new Date(i.validade)
    const diffDays = (validade.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  })

  return (
    <div className="space-y-6">
      {/* Críticos */}
      {criticos.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">report</span>
            <div>
              <h3 className="text-lg font-bold text-red-500">Estoque Crítico</h3>
              <p className="text-xs text-red-400/60">{criticos.length} {criticos.length === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
          <div className="space-y-2">
            {criticos.map(ing => (
              <div key={ing.id} className="flex justify-between items-center bg-red-500/5 p-3 rounded-xl">
                <div>
                  <p className="font-bold text-red-400">{ing.nome}</p>
                  <p className="text-xs text-red-400/60">
                    Atual: {ing.estoque_atual} {ing.unidade} | Mínimo: {ing.estoque_minimo}
                  </p>
                </div>
                {onRepor && (
                  <button
                    onClick={() => onRepor(ing)}
                    className="px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all"
                  >
                    Repor
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Baixos */}
      {baixos.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-yellow-500 text-3xl">warning</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-500">Estoque Baixo</h3>
              <p className="text-xs text-yellow-400/60">{baixos.length} {baixos.length === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
          <div className="space-y-2">
            {baixos.map(ing => (
              <div key={ing.id} className="flex justify-between items-center bg-yellow-500/5 p-3 rounded-xl">
                <div>
                  <p className="font-bold text-yellow-400">{ing.nome}</p>
                  <p className="text-xs text-yellow-400/60">
                    Atual: {ing.estoque_atual} {ing.unidade} | Mínimo: {ing.estoque_minimo}
                  </p>
                </div>
                {onRepor && (
                  <button
                    onClick={() => onRepor(ing)}
                    className="px-3 py-2 rounded-lg bg-yellow-500 text-white text-xs font-bold hover:bg-yellow-600 transition-all"
                  >
                    Repor
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vencimentos */}
      {vencendo.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-orange-500 text-3xl">schedule</span>
            <div>
              <h3 className="text-lg font-bold text-orange-500">Vencimento Próximo</h3>
              <p className="text-xs text-orange-400/60">{vencendo.length} {vencendo.length === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
          <div className="space-y-2">
            {vencendo.map(ing => (
              <div key={ing.id} className="flex justify-between items-center bg-orange-500/5 p-3 rounded-xl">
                <div>
                  <p className="font-bold text-orange-400">{ing.nome}</p>
                  <p className="text-xs text-orange-400/60">
                    Validade: {new Date(ing.validade!).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
