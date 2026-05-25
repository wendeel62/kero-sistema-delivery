import type { Mesa } from '../../hooks/usePdv'

interface OcuparMesaModalProps {
  show: boolean
  mesa: Mesa | null
  pessoas: number
  responsavel: string
  onPessoasChange: (v: number) => void
  onResponsavelChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function OcuparMesaModal({
  show,
  mesa,
  pessoas,
  responsavel,
  onPessoasChange,
  onResponsavelChange,
  onConfirm,
  onCancel
}: OcuparMesaModalProps) {
  if (!show || !mesa) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={onCancel} onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }} role="button" tabIndex={0}>
      <div className="bg-[#1a1a1a] rounded-3xl p-8 w-full max-w-sm border border-[#252830] shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()} role="presentation">
        <h3 className="font-[Outfit] text-2xl font-bold mb-2 text-white">Ocupar Mesa {mesa.numero}</h3>
        <p className="text-sm text-gray-400 mb-6">Informe os dados para abrir a comanda</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="mesa-pessoas" className="text-xs font-bold text-gray-400 mb-2 block">Número de Pessoas</label>
            <input id="mesa-pessoas" type="number" min="1" max={mesa.capacidade} value={pessoas} onChange={e => onPessoasChange(Number(e.target.value))} className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" />
          </div>
          <div>
            <label htmlFor="mesa-responsavel" className="text-xs font-bold text-gray-400 mb-2 block">Nome do Responsável (opcional)</label>
            <input id="mesa-responsavel" value={responsavel} onChange={e => onResponsavelChange(e.target.value)} placeholder="Ex: João" className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white" />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[#252830] text-gray-400 font-bold text-sm hover:text-white">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-[#e8391a] text-white font-bold text-sm">Abrir Comanda</button>
        </div>
      </div>
    </div>
  )
}
