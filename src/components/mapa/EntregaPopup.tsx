import { useMemo } from 'react'
import type { EntregaAtiva } from '../../types'

interface EntregaPopupContentProps {
  motoboyNome: string
  motoboyStatus: string
  entrega?: EntregaAtiva
}

/**
 * Conteúdo do popup para motoboy/entrega
 * Componente puro para otimização com memo
 */
export const EntregaPopupContent: React.FC<EntregaPopupContentProps> = ({
  motoboyNome,
  motoboyStatus,
  entrega
}) => {
  const statusInfo = useMemo(() => {
    const isEmEntrega = motoboyStatus === 'em_entrega'
    const isDisponivel = motoboyStatus === 'disponivel'
    
    return {
      color: isEmEntrega ? '#f57c24' : isDisponivel ? '#22c55e' : '#6b7280',
      label: isEmEntrega ? 'Em Entrega' : isDisponivel ? 'Disponível' : 'Inativo',
      bg: isEmEntrega ? '#fff3e0' : isDisponivel ? '#dcfce7' : '#f3f4f6',
      text: isEmEntrega ? '#c25e00' : isDisponivel ? '#166534' : '#4b5563'
    }
  }, [motoboyStatus])

  return (
    <div style={{
      padding: '8px',
      minWidth: '200px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header do Motoboy */}
      <div style={styles.header}>
        <div style={{
          ...styles.avatar,
          background: statusInfo.color
        }}>
          {motoboyNome[0]}
        </div>
        <div>
          <div style={styles.motoboyNome}>{motoboyNome}</div>
          <div style={{
            ...styles.statusLabel,
            color: statusInfo.color
          }}>
            {statusInfo.label}
          </div>
        </div>
      </div>

      {/* Informações da Entrega */}
      {entrega && entrega.pedido && (
        <div style={styles.entregaCard}>
          <div style={styles.entregaHeader}>Entregando Pedido</div>
          <div style={styles.pedidoNumero}>
            #{String(entrega.pedido.numero).padStart(4, '0')}
          </div>
          <div style={styles.clienteNome}>
            {entrega.pedido.cliente_nome}
          </div>
          <div style={styles.statusContainer}>
            <span style={{
              ...styles.statusBadge,
              background: entrega.status === 'coletado' ? '#f57c24' : '#3b82f6'
            }}>
              {entrega.status === 'coletado' ? 'A CAMINHO' : 'AGUARDANDO'}
            </span>
          </div>
        </div>
      )}

      {/* Status de disponível */}
      {!entrega && motoboyStatus === 'disponivel' && (
        <div style={styles.disponivelCard}>
          Livre para entregas
        </div>
      )}
    </div>
  )
}

// Estilos inline para melhor performance
const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold' as const,
    fontSize: '14px'
  },
  motoboyNome: {
    fontWeight: 'bold' as const,
    fontSize: '14px',
    color: '#1a1a1a'
  },
  statusLabel: {
    fontSize: '10px',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const
  },
  entregaCard: {
    background: '#f5f5f5',
    padding: '8px',
    borderRadius: '8px',
    marginTop: '4px'
  },
  entregaHeader: {
    fontSize: '10px',
    color: '#666',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    marginBottom: '2px'
  },
  pedidoNumero: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#1a1a1a'
  },
  clienteNome: {
    fontSize: '12px',
    color: '#333',
    marginTop: '2px'
  },
  statusContainer: {
    fontSize: '10px',
    color: '#666',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  statusBadge: {
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: 'bold' as const
  },
  disponivelCard: {
    background: '#dcfce7',
    padding: '8px',
    borderRadius: '8px',
    marginTop: '4px',
    fontSize: '12px',
    color: '#166534',
    textAlign: 'center' as const
  }
}

export default EntregaPopupContent
