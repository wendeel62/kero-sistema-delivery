import { memo, useState } from 'react'
import type { CartItem } from './useCarrinho'
import type { Config } from './types'

export interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  subtotal: number
  taxaEntrega: number
  total: number
  config: Config
  onSubmit: (data: {
    nome: string
    telefone: string
    endereco: string
    numero: string
    bairro: string
    formaPagamento: string
    observacoes: string
  }) => void
}

export const CheckoutModal = memo(function CheckoutModal({
  isOpen,
  onClose,
  cart,
  subtotal: _subtotal,
  taxaEntrega: _taxaEntrega,
  total,
  config: _config,
  onSubmit
}: CheckoutModalProps) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [observacoes, setObservacoes] = useState('')
  const [step, setStep] = useState<'dados' | 'pagamento'>('dados')

  const handleSubmit = () => {
    if (!nome || !telefone) return
    
    onSubmit({
      nome,
      telefone,
      endereco,
      numero,
      bairro,
      formaPagamento,
      observacoes
    })
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-surface-container rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-outline flex items-center justify-between sticky top-0 bg-surface-container">
          <h2 className="text-lg font-bold text-on-surface">
            {step === 'dados' ? 'Seus Dados' : 'Pagamento'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-variant hover:bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {step === 'dados' ? (
            <>
              <div>
                <label htmlFor="checkout-nome" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Nome Completo
                </label>
                <input
                  id="checkout-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 px-4 text-sm text-on-surface"
                />
              </div>

              <div>
                <label htmlFor="checkout-telefone" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  WhatsApp
                </label>
                <input
                  id="checkout-telefone"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 px-4 text-sm text-on-surface"
                />
              </div>

              <div>
                <label htmlFor="checkout-endereco" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Endereço
                </label>
                <input
                  id="checkout-endereco"
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Avenida, etc."
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 px-4 text-sm text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="checkout-numero" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                    Número
                  </label>
                  <input
                    id="checkout-numero"
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 px-4 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-bairro" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                    Bairro
                  </label>
                  <input
                    id="checkout-bairro"
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Centro"
                    className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 px-4 text-sm text-on-surface"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep('pagamento')}
                disabled={!nome || !telefone}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
              >
                Continuar
              </button>
            </>
          ) : (
            <>
              {/* Resumo do Pedido */}
              <div className="bg-surface-container-high rounded-xl p-4 space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">
                      {item.quantidade}x {item.produto.nome}
                    </span>
                    <span className="text-on-surface">
                      {formatCurrency(item.precoUnitario * item.quantidade)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-outline pt-2 flex justify-between font-bold">
                  <span className="text-on-surface">Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                {[
                  { value: 'pix', label: 'PIX', icon: 'qr_code' },
                  { value: 'cartao', label: 'Cartão', icon: 'credit_card' },
                  { value: 'dinheiro', label: 'Dinheiro', icon: 'payments' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFormaPagamento(opt.value)}
                    className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
                      formaPagamento === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-outline hover:border-outline/50'
                    }`}
                  >
                    <span className="material-symbols-outlined">{opt.icon}</span>
                    <span className="font-bold text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="checkout-obs" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Observações
                </label>
                <textarea
                  id="checkout-obs"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Sem cebola, troco para 50, etc."
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl py-3 px-4 text-sm text-on-surface resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('dados')}
                  className="flex-1 py-4 rounded-xl border border-outline text-on-surface-variant font-bold"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-4 rounded-xl bg-primary text-white font-bold"
                >
                  Finalizar Pedido
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
})
