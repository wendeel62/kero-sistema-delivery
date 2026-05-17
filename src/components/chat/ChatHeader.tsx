import { useMemo, useCallback } from 'react'
import AgentAvatar from '../AgentAvatar'
import type { ChatConnectionStatus } from '../../types'

interface ChatHeaderProps {
  connectionStatus: ChatConnectionStatus
  onClose: () => void
  onMinimize?: () => void
  title?: string
  subtitle?: string
  className?: string
}

/**
 * Cabeçalho do chat
 * - Avatar do agente
 * - Status da conexão
 * - Botões de controle (fechar, minimizar)
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  connectionStatus,
  onClose,
  onMinimize,
  title = 'Alex',
  subtitle,
  className = '',
}) => {
  // Status color e label
  const statusInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return { color: '#22c55e', label: 'Online' }
      case 'connecting':
        return { color: '#f59e0b', label: 'Conectando...' }
      case 'reconnecting':
        return { color: '#f97316', label: 'Reconectando...' }
      case 'offline':
        return { color: '#6b7280', label: 'Offline' }
      default:
        return { color: '#6b7280', label: 'Desconhecido' }
    }
  }, [connectionStatus])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleMinimize = useCallback(() => {
    onMinimize?.()
  }, [onMinimize])

  return (
    <div className={`flex items-center gap-3 p-4 border-b ${styles.header} ${className}`}>
      {/* Avatar */}
      <div style={styles.avatarWrapper}>
        <AgentAvatar size={36} />
      </div>

      {/* Título e status */}
      <div style={styles.titleContainer}>
        <div style={styles.title}>{title}</div>
        <div style={styles.statusContainer}>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: statusInfo.color,
            }}
          />
          <span style={{ ...styles.statusLabel, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>
        {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      </div>

      {/* Botões de controle */}
      <div style={styles.controls}>
        {onMinimize && (
          <button
            onClick={handleMinimize}
            style={styles.controlButton}
            aria-label="Minimizar chat"
          >
            <MinimizeIcon />
          </button>
        )}
        <button
          onClick={handleClose}
          style={styles.controlButton}
          aria-label="Fechar chat"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

/**
 * Ícone de minimizar
 */
const MinimizeIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

/**
 * Ícone de fechar
 */
const CloseIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/**
 * Estilos inline
 */
const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#1e293b',
    borderBottom: '1px solid rgba(249, 115, 22, 0.2)',
    height: '60px',
  },
  avatarWrapper: {
    flexShrink: 0,
  },
  titleContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#e2e8f0',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  statusLabel: {
    fontSize: '11px',
    fontWeight: 500,
  },
  subtitle: {
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  controls: {
    display: 'flex',
    gap: '4px',
  },
  controlButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'background-color 0.2s',
  },
}

export default ChatHeader
