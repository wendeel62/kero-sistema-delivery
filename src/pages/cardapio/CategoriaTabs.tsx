import { memo } from 'react'
import type { Categoria } from './types'

export interface CategoriaTabsProps {
  categorias: Categoria[]
  filtroAtivo: string | null
  onSetFiltro: (categoriaId: string | null) => void
}

export const CategoriaTabs = memo(function CategoriaTabs({
  categorias,
  filtroAtivo,
  onSetFiltro
}: CategoriaTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      {/* Todos */}
      <button
        onClick={() => onSetFiltro(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
          filtroAtivo === null
            ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/10'
            : 'bg-surface-container border-outline text-on-surface-variant hover:bg-surface-container-high hover:text-on-background'
        }`}
      >
        Todos
      </button>

      {/* Categorias */}
      {categorias.map((categoria) => (
        <button
          key={categoria.id}
          onClick={() => onSetFiltro(categoria.id)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
            filtroAtivo === categoria.id
              ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/10'
              : 'bg-surface-container border-outline text-on-surface-variant hover:bg-surface-container-high hover:text-on-background'
          }`}
        >
          {categoria.nome}
        </button>
      ))}
    </div>
  )
})

export default CategoriaTabs
