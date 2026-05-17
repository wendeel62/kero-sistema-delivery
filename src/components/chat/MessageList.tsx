import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import type { ChatMessage } from '../../types'
import AgentAvatar from '../AgentAvatar'

interface MessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  pendingAction?: {
    type: string
    data: Record<string, unknown>
  } | null
  onConfirmAction?: (confirmed: boolean) => void
  className?: string
}

/**
 * Lista de mensagens do chat
 * - Scroll automático para nova mensagem
 * - Typing indicator animado
 * - Read receipts (confirmação de leitura)
 * - Card de confirmação de ação
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
  pendingAction,
  onConfirmAction,
  className = '',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, pendingAction])

  // Formata hora
  const formatTime = useCallback((date: Date): string => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }, [])

  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 ${styles.container} ${className}`}
    >
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          formatTime={formatTime}
          isLast={index === messages.length - 1}
        />
      ))}

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator />}

      {/* Fim da lista para scroll */}
      <div ref={messagesEndRef} />

      {/* Card de Confirmação de Ação */}
      {pendingAction && onConfirmAction && (
        <ActionConfirmationCard
          action={pendingAction}
          onConfirm={onConfirmAction}
        />
      )}
    </div>
  )
}

/**
 * Item de mensagem individual
 */
const MessageItem = React.memo(({
  message,
  formatTime,
  isLast
}: {
  message: ChatMessage
  formatTime: (date: Date) => string
  isLast: boolean
}) => {
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={`flex gap-2 max-w-[85%] ${styles.messageWrapper} ${
        isAssistant ? 'self-start' : 'self-end flex-row-reverse'
      } message-enter`}
    >
      {isAssistant && <AgentAvatar size={24} />}
      
      <div
        style={{
          ...styles.messageBubble,
          ...(isAssistant
            ? message.isError
              ? styles.messageError
              : styles.messageAssistant
            : styles.messageUser),
        }}
      >
        <div style={styles.messageContent}>{message.content}</div>
        <div
          style={{
            ...styles.messageTime,
            ...(isAssistant ? styles.messageTimeAssistant : styles.messageTimeUser),
          }}
        >
          {formatTime(message.timestamp)}
          {message.isRead && isLast && (
            <span style={styles.readReceipt}>✓✓</span>
          )}
        </div>
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'

/**
 * Indicador de digitação
 */
const TypingIndicator: React.FC = () => (
  <div className={`flex gap-2 self-start ${styles.typingWrapper}`}>
    <AgentAvatar size={24} />
    <div style={styles.typingBubble}>
      <div style={styles.typingDots}>
        <div style={styles.typingDot} />
        <div style={styles.typingDot} />
        <div style={styles.typingDot} />
      </div>
    </div>
  </div>
)

/**
 * Card de confirmação de ação
 */
const ActionConfirmationCard: React.FC<{
  action: { type: string; data: Record<string, unknown> }
  onConfirm: (confirmed: boolean) => void
}> = ({ action, onConfirm }) => {
  const actionDescription = useMemo(() => {
    // Descrição formatada da ação
    switch (action.type) {
      case 'create_product':
        return `Criar produto "${String(action.data.name || '')}" por R$ ${Number(action.data.price).toFixed(2)}`
      case 'update_price':
        return `Atualizar preço para R$ ${Number(action.data.newPrice).toFixed(2)}`
      case 'toggle_product':
        return `${action.data.active ? 'Ativar' : 'Desativar'} o produto`
      case 'toggle_store_open':
        return action.data.open ? '🟢 ABRIR a loja' : '🔴 FECHAR a loja'
      default:
        return 'Executar ação no sistema'
    }
  }, [action])

  return (
    <div style={styles.actionCard}>
      <div style={styles.actionHeader}>
        <span>⚡</span>
        <span style={styles.actionTitle}>Alex quer executar:</span>
      </div>
      <p style={styles.actionDescription}>{actionDescription}</p>
      <div style={styles.actionButtons}>
        <button
          onClick={() => onConfirm(true)}
          style={styles.actionButtonConfirm}
        >
          ✅ Confirmar
        </button>
        <button
          onClick={() => onConfirm(false)}
          style={styles.actionButtonCancel}
        >
          ❌ Cancelar
        </button>
      </div>
    </div>
  )
}

/**
 * Estilos inline
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#020617',
    gap: '8px',
  },
  messageWrapper: {
    display: 'flex',
    gap: '8px',
    maxWidth: '85%',
  },
  messageBubble: {
    borderRadius: '16px',
    padding: '8px 12px',
    maxWidth: '100%',
    wordBreak: 'break-word' as const,
  },
  messageAssistant: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(249, 115, 22, 0.15)',
    color: '#e2e8f0',
  },
  messageUser: {
    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    color: 'white',
  },
  messageError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  messageContent: {
    fontSize: '13px',
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap' as const,
  },
  messageTime: {
    fontSize: '10px',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  messageTimeAssistant: {
    color: '#94a3b8',
    justifyContent: 'flex-end',
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'flex-end',
  },
  readReceipt: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  typingWrapper: {
    display: 'flex',
    gap: '8px',
  },
  typingBubble: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(249, 115, 22, 0.15)',
    borderRadius: '16px',
    padding: '8px 12px',
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#f97316',
    borderRadius: '50%',
    animation: 'typing-dot 1.4s infinite',
  },
  actionCard: {
    margin: '12px',
    padding: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid rgba(249, 115, 22, 0.3)',
    borderRadius: '12px',
  },
  actionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  actionTitle: {
    fontSize: '13px',
    color: '#fbbf24',
    fontWeight: 500,
  },
  actionDescription: {
    fontSize: '12px',
    color: '#cbd5e1',
    marginBottom: '12px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  actionButtonConfirm: {
    flex: 1,
    padding: '6px 12px',
    borderRadius: '8px',
    backgroundColor: '#f97316',
    color: 'white',
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  actionButtonCancel: {
    flex: 1,
    padding: '6px 12px',
    borderRadius: '8px',
    backgroundColor: '#334155',
    color: '#cbd5e1',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  },
}

export default MessageList
