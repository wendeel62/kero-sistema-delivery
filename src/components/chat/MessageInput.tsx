import { useRef, useEffect, useCallback } from 'react'
import AgentAvatar from '../AgentAvatar'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  isTyping?: boolean
  placeholder?: string
  className?: string
}

/**
 * Input de mensagens do chat
 * - Auto-resize do textarea
 * - Envio com Enter (Shift+Enter para nova linha)
 * - Botão de envio com estado disabled
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  isTyping = false,
  placeholder = 'Digite sua mensagem...',
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [value])

  // Foca no input ao abrir
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }, [onSend])

  const canSend = value.trim().length > 0 && !disabled && !isTyping

  return (
    <div className={`flex items-end gap-2 p-3 border-t ${styles.container} ${className}`}>
      <div style={styles.avatarWrapper}>
        <AgentAvatar size={28} />
      </div>
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isTyping}
        rows={1}
        style={{
          ...styles.textarea,
          ...(canSend ? styles.textareaActive : styles.textareaDisabled),
        }}
      />

      <button
        onClick={onSend}
        disabled={!canSend}
        style={{
          ...styles.sendButton,
          ...(canSend ? styles.sendButtonActive : {}),
        }}
        aria-label="Enviar mensagem"
      >
        <SendIcon />
      </button>
    </div>
  )
}

/**
 * Ícone de envio (papel)
 */
const SendIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22,2 15,22 11,13 2,9" />
  </svg>
)

/**
 * Estilos inline para performance
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0f172a',
    borderTop: '1px solid rgba(249, 115, 22, 0.15)',
  },
  avatarWrapper: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  textarea: {
    flex: 1,
    minHeight: '44px',
    maxHeight: '100px',
    resize: 'none' as const,
    backgroundColor: '#1e293b',
    border: '1px solid rgba(249, 115, 22, 0.2)',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '13px',
    color: '#e2e8f0',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textareaActive: {
    borderColor: 'rgba(249, 115, 22, 0.5)',
  },
  textareaDisabled: {
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  sendButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer',
  },
  sendButtonActive: {
    backgroundColor: '#f97316',
    color: 'white',
    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
  },
}

export default MessageInput
