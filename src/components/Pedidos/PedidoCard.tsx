import React from 'react';

interface PedidoCardProps {
  id: string;
  cliente: string;
  valor: number;
  status: string;
}

export function PedidoCard({ id, cliente, valor, status }: PedidoCardProps) {
  return (
    <div className="pedido-card">
      <span className="pedido-id">#{id}</span>
      <span className="pedido-cliente">{cliente}</span>
      <span className="pedido-valor">R$ {valor.toFixed(2)}</span>
      <span className="pedido-status">{status}</span>
    </div>
  );
}