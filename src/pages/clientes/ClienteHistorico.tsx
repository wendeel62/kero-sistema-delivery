import { memo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Cliente } from './types'

export interface ClienteHistoricoProps {
  cliente: Cliente
  tenantId: string
}

export const ClienteHistorico = memo(function ClienteHistorico({ cliente, tenantId }: ClienteHistoricoProps) {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistorico = async () => {
    setLoading(true)
    // Implement fetch logic
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h5 className="font-black text-[10px] text-[#e8391a] uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">history</span> Histórico de Pedidos
      </h5>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-[#e8391a] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.length === 0 ? (
            <p className="text-xs text-white/40 italic text-center">Nenhum pedido encontrado.</p>
          ) : (
            pedidos.map((pedido, i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#16181f] border border-[#252830]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-white">Pedido #{pedido.numero}</span>
                  <span className="text-xs text-white/40">{format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">{pedido.itens?.length || 0} itens</span>
                  <span className="text-sm font-bold text-emerald-400">R$ {pedido.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
})
