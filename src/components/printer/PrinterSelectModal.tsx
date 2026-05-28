import { useState, useEffect, useCallback } from 'react'

interface PrinterSelectModalProps {
  printers: string[]
  onSelect: (name: string) => void
  onClose: () => void
}

export function PrinterSelectModal({ printers, onSelect, onClose }: PrinterSelectModalProps) {
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    if (printers.length > 0 && !selected) {
      setSelected(printers[0])
    }
  }, [printers, selected])

  const handleConfirm = useCallback(() => {
    if (selected) {
      onSelect(selected)
    }
  }, [selected, onSelect])

  return (
    <div className="fixed inset-0 z-[100] flex justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} role="presentation" />
      <div className="relative w-full max-w-sm md:max-w-md mt-[20vh] mb-8 mx-4 bg-surface-container text-on-background rounded-3xl shadow-2xl border border-outline/20 overflow-hidden self-start">
        <div className="p-6 pb-4 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">print</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Selecionar Impressora</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Escolha qual impressora instalada no seu computador será usada para imprimir os pedidos.
            </p>
          </div>
        </div>

        <div className="px-6 pb-4">
          {printers.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 mb-2 block">print_disabled</span>
              <p className="text-sm text-on-surface-variant">Nenhuma impressora encontrada</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">Verifique se há impressoras instaladas no sistema</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {printers.map(name => (
                <button
                  key={name}
                  onClick={() => setSelected(name)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    selected === name
                      ? 'border-primary bg-primary/10 text-on-background'
                      : 'border-outline hover:border-primary/30 text-on-surface-variant'
                  }`}
                >
                  <span className={`material-symbols-outlined ${
                    selected === name ? 'text-primary' : 'text-on-surface-variant/50'
                  }`}>
                    {selected === name ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  <span className="font-medium text-sm">{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-outline text-on-surface-variant font-medium text-sm hover:bg-surface-container-high transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-1 h-11 bg-primary hover:bg-primary-bright text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
