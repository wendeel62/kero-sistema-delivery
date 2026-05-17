import { memo } from 'react'
import type { Ingrediente } from './types'

export interface ProdutosEstoqueProps {
  ingredientes: Ingrediente[]
  loading: boolean
  onEdit: (ingrediente: Ingrediente) => void
  onEntry: (ingrediente: Ingrediente) => void
}

export const ProdutosEstoque = memo(function ProdutosEstoque({
  ingredientes,
  loading,
  onEdit,
  onEntry
}: ProdutosEstoqueProps) {
  const getStatusColor = (ing: Ingrediente) => {
    if (ing.estoque_atual <= ing.estoque_critico) return 'text-red-500'
    if (ing.estoque_atual <= ing.estoque_minimo) return 'text-yellow-500'
    return 'text-on-background'
  }

  const getProgressColor = (ing: Ingrediente) => {
    if (ing.estoque_atual <= ing.estoque_critico) return 'bg-red-500'
    if (ing.estoque_atual <= ing.estoque_minimo) return 'bg-yellow-500'
    return 'bg-primary'
  }

  const getProgressWidth = (ing: Ingrediente) => {
    return Math.min((ing.estoque_atual / (ing.estoque_minimo * 2)) * 100, 100)
  }

  if (loading) {
    return (
      <div className="col-span-full py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (ingredientes.length === 0) {
    return (
      <div className="col-span-full py-20 text-center text-on-surface-variant">
        <span className="material-symbols-outlined text-6xl mb-4 block opacity-20">inventory_2</span>
        <p>Nenhum insumo cadastrado</p>
      </div>
    )
  }

  return (
    <>
      {ingredientes.map(ing => (
        <div
          key={ing.id}
          className="bg-surface-container rounded-3xl p-6 border border-outline group hover:border-primary/30 transition-all shadow-lg hover:shadow-primary/5"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {ing.categoria}
              </span>
              <h4 className="text-lg font-bold text-on-background">{ing.nome}</h4>
              {ing.lote && (
                <span className="text-[10px] text-on-surface-variant">
                  Lote: {ing.lote}
                </span>
              )}
              {ing.validade && (
                <span className="text-[10px] text-on-surface-variant block">
                  Validade: {new Date(ing.validade).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            <button
              onClick={() => onEdit(ing)}
              className="p-2 hover:bg-primary/10 rounded-xl text-primary opacity-0 group-hover:opacity-100 transition-all"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
          </div>

          {/* Stats */}
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                Estoque Atual
              </span>
              <span className={`text-2xl font-black ${getStatusColor(ing)}`}>
                {ing.estoque_atual}{' '}
                <span className="text-xs font-normal opacity-50">{ing.unidade}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                Custo Médio
              </span>
              <div className="text-sm font-bold text-emerald-400">
                R$ {ing.custo_medio.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-outline rounded-full overflow-hidden mb-4">
            <div
              className={`h-full ${getProgressColor(ing)} transition-all duration-1000`}
              style={{ width: `${getProgressWidth(ing)}%` }}
            />
          </div>

          {/* Min/Max */}
          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-on-surface-variant/50">
            <span>Min: {ing.estoque_minimo}</span>
            <span>Crítico: {ing.estoque_critico}</span>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-outline flex gap-2">
            <button
              onClick={() => onEntry(ing)}
              className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
            >
              Entrada
            </button>
            <button
              onClick={() => onEdit(ing)}
              className="flex-1 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container"
            >
              Editar
            </button>
          </div>
        </div>
      ))}
    </>
  )
})
