import type { Sabor } from '../../hooks/useCardapioAdmin'

interface SaborModalProps {
  editSabor: Partial<Sabor> | null
  showSaborModal: boolean
  onSave: () => void
  onClose: () => void
  onEditChange: (updates: Partial<Sabor>) => void
}

export default function SaborModal({
  editSabor,
  showSaborModal,
  onSave,
  onClose,
  onEditChange
}: SaborModalProps) {
  if (!showSaborModal) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-10 w-full max-w-lg border border-[#252830] shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white tracking-tight">{editSabor?.id ? 'Editar' : 'Novo'} Sabor</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Nome do Sabor</label>
            <input
              value={editSabor?.nome || ''}
              onChange={e => onEditChange({ nome: e.target.value })}
              placeholder="Ex: Margherita"
              className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Descricao</label>
            <textarea
              value={editSabor?.descricao || ''}
              onChange={e => onEditChange({ descricao: e.target.value })}
              placeholder="Ex: Molho de tomate, mussarela, manjericao fresco"
              rows={3}
              className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-4 px-5 text-sm text-white resize-none"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${editSabor?.disponivel !== false ? 'bg-[#e8391a] border-[#e8391a]' : 'border-[#444]'}`}>
              <input
                type="checkbox"
                className="hidden"
                checked={editSabor?.disponivel ?? true}
                onChange={e => onEditChange({ disponivel: e.target.checked })}
              />
              {editSabor?.disponivel !== false && <span className="material-symbols-outlined text-white text-base">check</span>}
            </div>
            <span className="text-sm font-bold uppercase tracking-widest opacity-80 group-hover:opacity-100 text-white">Disponivel</span>
          </label>
        </div>
        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-4 rounded-xl border border-[#252830] text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-[#252830] transition-all">Cancelar</button>
          <button onClick={onSave} className="flex-1 py-4 rounded-xl bg-[#e8391a] text-white font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(232,57,26,0.3)] transition-all">Salvar</button>
        </div>
      </div>
    </div>
  )
}
