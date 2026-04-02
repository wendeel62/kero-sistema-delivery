import type { Categoria } from '../pages/CardapioOnlinePage'

interface CategoryFiltersProps {
  categorias: Categoria[]
  filtroAtivo: string | null
  onSetFiltro: (id: string | null) => void
}

export default function CategoryFilters({ categorias, filtroAtivo, onSetFiltro }: CategoryFiltersProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
      <button 
        onClick={() => onSetFiltro(null)} 
        className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
          !filtroAtivo 
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
            : 'border border-zinc-700 text-gray-400 bg-transparent hover:border-zinc-500'
        }`}
      >
        Tudo
      </button>

      {categorias.map(c => (
        <button 
          key={c.id} 
          onClick={() => onSetFiltro(c.id)} 
          className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
            filtroAtivo === c.id 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
              : 'border border-zinc-700 text-gray-400 bg-transparent hover:border-zinc-500'
          }`}
        >
          {c.nome}
        </button>
      ))}
    </div>
  )
}
