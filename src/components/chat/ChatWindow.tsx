import { useCallback } from 'react'
import type { ChatMessage, ChatActionPayload, ChatConnectionStatus } from '../../types'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

interface ChatWindowProps {
  isOpen: boolean
  messages: ChatMessage[]
  isTyping: boolean
  inputValue: string
  connectionStatus: ChatConnectionStatus
  pendingAction?: ChatActionPayload | null
  onClose: () => void
  onSend: (content: string) => void
  onInputChange: (value: string) => void
  onConfirmAction?: (confirmed: boolean) => void
  title?: string
  className?: string
}

/**
 * Janela principal do chat
 * - Gerencia estado de aberto/fechado
 * - Controla input e envio de mensagens
 * - Exibe lista de mensagens e header
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  messages,
  isTyping,
  inputValue,
  connectionStatus,
  pendingAction,
  onClose,
  onSend,
  onInputChange,
  onConfirmAction,
  title = 'Alex',
  className = '',
}) => {
  // Handler de envio
  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      onSend(inputValue)
      onInputChange('')
    }
  }, [inputValue, onSend, onInputChange])

  // Handler de confirmação de ação
  const handleConfirmAction = useCallback((confirmed: boolean) => {
    onConfirmAction?.(confirmed)
  }, [onConfirmAction])

  if (!isOpen) return null

  return (
    <div
      className={`flex flex-col fixed bottom-[88px] right-4 z-[98]
        w-[min(360px,calc(100vw-32px))] h-[min(500px,calc(100vh-120px))]
        bg-slate-900 rounded-2xl overflow-hidden shadow-2xl
        border border-slate-700 chat-open ${className}`}
    >
      {/* Header */}
      <ChatHeader
        connectionStatus={connectionStatus}
        onClose={onClose}
        title={title}
      />

      {/* Lista de mensagens */}
      <MessageList
        messages={messages}
        isTyping={isTyping}
        pendingAction={pendingAction || undefined}
        onConfirmAction={handleConfirmAction}
      />

      {/* Input de mensagem */}
      <MessageInput
        value={inputValue}
        onChange={onInputChange}
        onSend={handleSend}
        disabled={isTyping}
        isTyping={isTyping}
      />
    </div>
  )
}

export default ChatWindow
