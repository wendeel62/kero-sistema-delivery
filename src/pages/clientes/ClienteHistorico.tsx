import { memo, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

export interface ClienteHistoricoProps {
  clienteNome: string
  clienteTelefone: string
  tenantId: string
}

interface PedidoRow {
  id: string
  numero: number
  tipo: string
  total: number
  status: string
  created_at: string
  itens_pedido?: Array<Record<string, unknown>>
}

export const ClienteHistorico = memo(function ClienteHistorico({ clienteNome, clienteTelefone, tenantId }: ClienteHistoricoProps) {
  const [pedidos, setPedidos] = useState<PedidoRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clienteTelefone) return
    const telefoneLimpo = clienteTelefone.replace(/\D/g, '')

    setLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('*, itens_pedido(*)')
        .eq('tenant_id', tenantId)
        .eq('cliente_telefone', telefoneLimpo)
        .order('created_at', { ascending: false })
        .limit(20)
      setPedidos((data || []) as PedidoRow[])
      setLoading(false)
    })()
  }, [clienteTelefone, clienteNome, tenantId])

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
            pedidos.map((pedido) => (
              <div key={pedido.id} className="p-4 rounded-2xl bg-[#16181f] border border-[#252830]">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">#{String(pedido.numero).padStart(4, '0')}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${pedido.tipo === 'entrega' ? 'text-orange-400 border-orange-500/20 bg-orange-500/10' : pedido.tipo === 'mesa' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 'text-white/60 border-white/20 bg-white/5'}`}>
                      {pedido.tipo === 'entrega' ? 'Entrega' : pedido.tipo === 'mesa' ? 'Mesa' : 'Balcão'}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">{format(parseISO(pedido.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">{pedido.itens_pedido?.length || 0} itens</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase ${pedido.status === 'entregue' ? 'text-emerald-400' : pedido.status === 'cancelado' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {pedido.status}
                    </span>
                    <span className="text-sm font-bold text-emerald-400">R$ {Number(pedido.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
})
