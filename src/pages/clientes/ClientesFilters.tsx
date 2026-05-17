import { memo } from 'react'

export interface ClientesFiltersProps {
  searchTerm: string
  filterPerfil: 'todos' | 'novo' | 'recorrente' | 'vip'
  onSearchChange: (term: string) => void
  onFilterChange: (perfil: 'todos' | 'novo' | 'recorrente' | 'vip') => void
}

export const ClientesFilters = memo(function ClientesFilters({
  searchTerm,
  filterPerfil,
  onSearchChange,
  onFilterChange
}: ClientesFiltersProps) {
  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-outline mb-6 flex flex-col md:flex-row gap-4">
      {/* Barra de busca */}
      <div className="flex-1 relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 pl-12 pr-4 text-sm text-on-surface placeholder-on-surface-variant focus:border-primary outline-none transition-all"
        />
      </div>

      {/* Filtros de perfil */}
      <div className="grid grid-cols-4 md:flex gap-1 sm:gap-2 w-full md:w-auto">
        {['todos', 'novo', 'recorrente', 'vip'].map((p) => (
          <button
            key={p}
            onClick={() => onFilterChange(p as any)}
            className={`w-full md:w-auto px-1 sm:px-4 py-2 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-tighter transition-all border whitespace-nowrap ${
              filterPerfil === p
                ? 'bg-primary/20 border-primary/30 text-primary'
                : 'border-outline text-on-surface-variant hover:bg-outline hover:text-on-surface'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
})
