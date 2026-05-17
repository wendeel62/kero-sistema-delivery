import type { Categoria } from '../../hooks/cardapio/types'

interface CategoriaListProps {
  categorias: Categoria[]
  draggedCategoria: string | null
  onDragStart: (id: string) => void
  onDrop: (e: React.DragEvent, targetId: string) => void
  onEdit: (c: Categoria) => void
  onDelete: (id: string) => void
  onNew: () => void
}

export default function CategoriaList({
  categorias,
  draggedCategoria,
  onDragStart,
  onDrop,
  onEdit,
  onDelete,
  onNew
}: CategoriaListProps) {
  return (
    <div>
      <button
        onClick={onNew}
        className="mb-6 sm:mb-8 w-full sm:w-auto bg-[#e8391a] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-lg">add</span> Nova Categoria
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categorias.map(c => (
          <div
            key={c.id}
            draggable
            onDragStart={() => onDragStart(c.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, c.id)}
            className={`bg-[#1a1a1a] p-8 rounded-2xl border transition-all group cursor-grab active:cursor-grabbing relative overflow-hidden ${draggedCategoria === c.id ? 'border-[#e8391a] opacity-50 scale-95 shadow-lg' : 'border-[#252830] hover:border-[#e8391a]/30'}`}
          >
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-transparent via-[#252830] to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-[#252830]/50 text-xs">drag_indicator</span>
            </div>
            <div className="flex justify-between items-start pl-2">
              <div>
                <h4 className="font-[Outfit] font-bold text-xl text-white">{c.nome}</h4>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{c.descricao}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(c)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-[#e8391a] hover:bg-[#e8391a] hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#252830] text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
