import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Cliente } from './types'

export interface ClienteDetailsProps {
  cliente: Cliente
  onClose: () => void
  onUpdate: () => void
  tenantId: string
}

export function ClienteDetails({ cliente, onClose, onUpdate, tenantId }: ClienteDetailsProps) {
  const [obs, setObs] = useState(cliente.observacoes || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const getPerfilBadge = (perfil: string) => {
    switch (perfil) {
      case 'vip': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'recorrente': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  }

  const saveObs = async () => {
    setIsUpdating(true)
    await supabase.from('clientes').update({ observacoes: obs }).eq('id', cliente.id).eq('tenant_id', tenantId)
    onUpdate()
    setIsUpdating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#16181f] h-full shadow-2xl animate-slide-in-right overflow-y-auto no-scrollbar border-l border-[#252830]">
        <div className="p-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-white tracking-tight">Perfil do Cliente</h3>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-[#252830] rounded-full transition-all text-white/60">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Avatar e Nome */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-[#e8391a] to-[#ff6b4a] flex items-center justify-center text-5xl font-black text-white shadow-2xl mb-6 ring-8 ring-[#e8391a]/5">
              {cliente.nome[0]}
            </div>
            <h4 className="text-2xl font-bold text-white mb-1">{cliente.nome}</h4>
            <p className="text-white/40 text-sm font-medium mb-4">{cliente.telefone}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPerfilBadge(cliente.perfil)}`}>
                {cliente.perfil}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-[#0c0e15] p-6 rounded-3xl border border-[#252830] text-center">
              <span className="text-[10px] text-white/40 uppercase font-bold block mb-1">Pontos Fidelidade</span>
              <span className="text-3xl font-black text-[#e8391a]">{cliente.pontos}</span>
            </div>
            <div className="bg-[#0c0e15] p-6 rounded-3xl border border-[#252830] text-center">
              <span className="text-[10px] text-white/40 uppercase font-bold block mb-1">Saldo Cashback</span>
              <span className="text-3xl font-black text-emerald-400">R$ {cliente.cashback.toFixed(2)}</span>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="bg-[#0c0e15] p-8 rounded-[2rem] border border-[#252830] mb-10">
            <h5 className="font-black text-[10px] text-[#e8391a] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">analytics</span> Estatísticas de Compra
            </h5>
            <div className="grid grid-cols-1 gap-5">
              <div className="flex justify-between items-center text-sm border-b border-[#252830]/50 pb-3">
                <span className="text-white/40 font-medium">Frequência Total:</span>
                <span className="font-black text-lg text-white">{cliente.total_pedidos} <span className="text-[10px] font-normal text-white/40">pedidos</span></span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-[#252830]/50 pb-3">
                <span className="text-white/40 font-medium">Investimento Total:</span>
                <span className="font-black text-lg text-emerald-400">R$ {cliente.total_gasto?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/40 font-medium">Ticket Médio:</span>
                <span className="font-black text-lg text-white">R$ {cliente.total_pedidos > 0 ? (cliente.total_gasto / cliente.total_pedidos).toFixed(2) : '0,00'}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-[#0c0e15] p-8 rounded-[2rem] border border-[#252830] mb-10">
            <h5 className="font-black text-[10px] text-[#e8391a] uppercase tracking-widest mb-6 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">sticky_note_2</span> Notas do Estabelecimento
              </div>
              {isUpdating && <div className="w-3 h-3 border-2 border-[#e8391a] border-t-transparent rounded-full animate-spin" />}
            </h5>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              onBlur={saveObs}
              className="w-full bg-[#16181f] border-none rounded-2xl p-5 text-xs h-32 italic outline-none focus:ring-1 focus:ring-[#e8391a]/20 transition-all text-white/70 leading-loose"
              placeholder="Adicione observações internas sobre este cliente..."
            />
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.open(`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`, '_blank')}
              className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-xl active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-xl">chat</span> ENVIAR CUPOM VIA WHATSAPP
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
