import { useMemo } from 'react'
import AgentAvatar from '../AgentAvatar'

interface ChatButtonProps {
  isOpen: boolean
  onClick: () => void
  unreadCount?: number
  hasNewMessages?: boolean
  className?: string
}

/**
 * Botão flutuante do chat
 * - Avatar do agente
 * - Indicador de status online
 * - Badge de mensagens não lidas
 * - Animação de pulso quando há novas mensagens
 */
export const ChatButton: React.FC<ChatButtonProps> = ({
  isOpen,
  onClick,
  unreadCount = 0,
  hasNewMessages = false,
  className = '',
}) => {
  // Verifica se há mensagens não lidas
  const showBadge = useMemo(() => {
    return unreadCount > 0 || hasNewMessages
  }, [unreadCount, hasNewMessages])

  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-5 right-4 z-[99] w-[52px] h-[52px] rounded-full
        bg-gradient-to-br from-slate-800 to-slate-900
        shadow-2xl border-2 border-orange-500
        flex items-center justify-center
        transition-all duration-200 ease-out hover:scale-110 active:scale-95
        ${!isOpen ? 'agent-fab-idle' : ''}
        ${className}
      `}
      aria-label="Abrir chat com Alex"
      style={styles.button}
    >
      <AgentAvatar size={44} />
      
      {/* Indicador online */}
      <div style={styles.onlineDot} />
      
      {/* Badge de mensagens não lidas */}
      {showBadge && (
        <div style={styles.badge}>
          <span style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount || '1'}
          </span>
        </div>
      )}
    </button>
  )
}

/**
 * Estilos inline
 */
const styles: Record<string, React.CSSProperties> = {
  button: {
    position: 'fixed',
    bottom: '20px',
    right: '16px',
    zIndex: 99,
    width: '52px',
    height: '52px',
    borderRadius: '9999px',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '2px solid #f97316',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease-out',
    cursor: 'pointer',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '12px',
    height: '12px',
    backgroundColor: '#22c55e',
    borderRadius: '50%',
    border: '2px solid #0f172a',
  },
  badge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#f97316',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #0f172a',
    animation: 'pulse-badge 2s infinite',
  },
  badgeText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: 'white',
  },
}

export default ChatButton
