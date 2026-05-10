import type { Categoria } from '../../hooks/useCardapioAdmin'

interface CategoriaModalProps {
  editCategoria: Partial<Categoria> | null
  showCategoriaModal: boolean
  onSave: () => void
  onClose: () => void
  onEditChange: (updates: Partial<Categoria>) => void
}

export default function CategoriaModal({
  editCategoria,
  showCategoriaModal,
  onSave,
  onClose,
  onEditChange
}: CategoriaModalProps) {
  if (!showCategoriaModal) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-10 w-full max-w-lg border border-[#252830] shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white tracking-tight">{editCategoria?.id ? 'Editar' : 'Nova'} Categoria</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Nome da Categoria</label>
            <input
              value={editCategoria?.nome || ''}
              onChange={e => onEditChange({ nome: e.target.value })}
              placeholder="Ex: Pizzas Gourmet"
              className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Descricao</label>
            <textarea
              value={editCategoria?.descricao || ''}
              onChange={e => onEditChange({ descricao: e.target.value })}
              placeholder="Pequena descricao para o cardapio"
              rows={3}
              className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white resize-none"
            />
          </div>
        </div>
        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-4 rounded-xl border border-[#252830] text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#252830] transition-all">Cancelar</button>
          <button onClick={onSave} className="flex-1 py-4 rounded-xl bg-[#e8391a] text-white font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] transition-all">Salvar</button>
        </div>
      </div>
    </div>
  )
}
