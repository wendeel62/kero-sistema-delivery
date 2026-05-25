import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { useAgentContext } from '../../hooks/useAgentContext'
import { ChatButton } from './ChatButton'
import { ChatWindow } from './ChatWindow'
import { useChatIntegrations } from './useChatIntegrations'
import type { ChatMessage, ChatActionPayload } from '../../types'

interface ChatProps {
  userId: string
  tenantId: string
  autoOpenOnLogin?: boolean
}

const SUPABASE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`

/**
 * FloatingAgentChat - Componente principal do chat
 * Gerencia estado global e integra todos os subcomponentes
 */
export const FloatingAgentChat = memo(function FloatingAgentChat({ userId, tenantId, autoOpenOnLogin = false }: ChatProps) {
  const context = useAgentContext(tenantId)

  // Estado local
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [hasGreeted, setHasGreeted] = useState(false)
  const [pendingAction, setPendingAction] = useState<ChatActionPayload | null>(null)

  // Hook de integrações
  const {
    sendMessage: sendToIntegration,
    isProcessing,
    connectionStatus,
  } = useChatIntegrations({
    userId,
    tenantId,
    apiEndpoint: SUPABASE_FUNCTION_URL,
    context: context as any,
    onTypingStart: () => {},
    onTypingEnd: () => {},
    onActionReceived: (action) => {
      setPendingAction(action)
    },
  })

  // Mensagem de boas-vindas dinâmica
  const getDynamicWelcome = useCallback((): string => {
    if (!context) {
      return 'Olá! 👋 Sou o Alex, seu assistente do KERO. Posso te ajudar com dúvidas sobre o cardápio digital, configurações ou qualquer coisa sobre a plataforma. Como posso ajudar?'
    }
    if (context.isFirstAccess) {
      return `Olá! 👋 Bom-vindo ao KERO! Sou o Alex, seu assistente. Vou te ajudar a configurar tudo para começar a vender. Vamos começar? 🚀`
    }
    if (context.todayRevenue > 0) {
      return `Olá! 👋 Bom dia! Vi que você já vendeu R$ ${context.todayRevenue.toFixed(2)} hoje — ${context.totalOrders} pedidos. Posso ajudar com alguma coisa?`
    }
    return 'Olá! 👋 Sou o Alex, seu assistente do KERO. Posso te ajudar com dúvidas sobre o cardápio digital, configurações ou qualquer coisa sobre a plataforma. Como posso ajudar?'
  }, [context])

  // Auto-open no login
  useEffect(() => {
    if (!userId || !context || !autoOpenOnLogin) return

    const today = new Date().toISOString().split('T')[0]
    const loginKey = `alex_greeted_${userId}_${today}`
    const alreadyGreeted = localStorage.getItem(loginKey)

    if (!alreadyGreeted) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 2000)
      localStorage.setItem(loginKey, 'true')
      return () => clearTimeout(timer)
    }
  }, [userId, context, autoOpenOnLogin])

  // Boas-vindas ao abrir o chat
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      const timer = setTimeout(() => {
        const welcome: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: getDynamicWelcome(),
          timestamp: new Date(),
          isRead: false,
        }
        setMessages([welcome])
        setHasGreeted(true)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, hasGreeted, getDynamicWelcome])

  // Handler de envio de mensagem
  const handleSend = useCallback(async (content: string) => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isProcessing) return

    // Adiciona mensagem do usuário
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedContent,
      timestamp: new Date(),
      isRead: true,
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Envia para API
    const history = messages.map(({ role, content: msgContent }) => ({
      role,
      content: msgContent,
    }))

    const response = await sendToIntegration([...history, { role: 'user', content: trimmedContent }])

    if (response?.reply) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply,
          timestamp: new Date(),
          isRead: false,
        },
      ])
    }
  }, [messages, isProcessing, sendToIntegration])

  // Handler de confirmação de ação
  const handleConfirmAction = useCallback(async (confirmed: boolean) => {
    if (!confirmed || !pendingAction) {
      setPendingAction(null)
      return
    }

    setPendingAction(null)
    // Ação será processada pelo hook de integrações
  }, [pendingAction])

  // Toggle do chat
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  // Close do chat
  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Mensagens não lidas
  const unreadCount = useMemo(() => {
    return messages.filter(m => m.role === 'assistant' && !m.isRead).length
  }, [messages])

  return (
    <>
      {/* Botão flutuante */}
      <ChatButton
        isOpen={isOpen}
        onClick={toggleChat}
        unreadCount={unreadCount}
        hasNewMessages={!hasGreeted}
      />

      {/* Janela do chat */}
      <ChatWindow
        isOpen={isOpen}
        messages={messages}
        isTyping={isProcessing}
        inputValue={inputValue}
        connectionStatus={connectionStatus}
        pendingAction={pendingAction}
        onClose={closeChat}
        onSend={handleSend}
        onInputChange={setInputValue}
        onConfirmAction={handleConfirmAction}
      />
    </>
  )
})
