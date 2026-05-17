import { memo } from 'react'
import { format } from 'date-fns'
import type { Cliente } from './types'

export interface ClientesTableProps {
  clientes: Cliente[]
  loading: boolean
  onOpenDrawer: (cliente: Cliente) => void
}

export const ClientesTable = memo(function ClientesTable({
  clientes,
  loading,
  onOpenDrawer
}: ClientesTableProps) {
  const getPerfilBadge = (perfil: string) => {
    switch (perfil) {
      case 'vip': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'recorrente': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  }

  if (loading) {
    return (
      <div className="bg-surface-container rounded-3xl border border-outline overflow-hidden shadow-lg p-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (clientes.length === 0) {
    return (
      <div className="bg-surface-container rounded-3xl border border-outline overflow-hidden shadow-lg p-20 text-center">
        <p className="text-on-surface-variant italic">Nenhum cliente encontrado.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container rounded-3xl border border-outline overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline bg-surface-container-lowest/50">
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                Cliente
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                Perfil
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                Pedidos
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                Gasto
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                Último Pedido
              </th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/30">
            {clientes.map(cliente => (
              <tr
                key={cliente.id}
                className="group hover:bg-primary/5 cursor-pointer"
                onClick={() => onOpenDrawer(cliente)}
              >
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-outline flex items-center justify-center font-bold text-primary">
                      {cliente.nome[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-on-background">{cliente.nome}</div>
                      <div className="text-[10px] text-on-surface-variant">{cliente.telefone}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getPerfilBadge(cliente.perfil)}`}>
                    {cliente.perfil}
                  </span>
                </td>
                <td className="p-6 text-center font-medium text-on-background">
                  {cliente.total_pedidos}
                </td>
                <td className="p-6 text-center font-bold text-emerald-400">
                  R$ {cliente.total_gasto?.toFixed(2) || '0.00'}
                </td>
                <td className="p-6 text-center text-xs text-on-surface-variant">
                  {cliente.ultimo_pedido ? format(new Date(cliente.ultimo_pedido), "dd/MM/yy") : '---'}
                </td>
                <td className="p-6 text-center">
                  <button
                    className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDrawer(cliente)
                    }}
                  >
                    <span className="material-symbols-outlined text-xl">visibility</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})
