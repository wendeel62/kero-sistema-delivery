import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatMessage, ChatConnectionStatus } from '../../types'

/**
 * Configurações do hook
 */
interface UseChatMessagesConfig {
  userId: string
  tenantId: string
  apiEndpoint: string
  maxHistory?: number
  offlineEnabled?: boolean
}

/**
 * Retorno do hook
 */
interface UseChatMessagesReturn {
  messages: ChatMessage[]
  isTyping: boolean
  connectionStatus: ChatConnectionStatus
  sendMessage: (content: string) => Promise<void>
  markAsRead: (messageId: string) => void
  clearMessages: () => void
  retryLastMessage: () => Promise<void>
  queueLength: number
}

/**
 * Hook para gerenciamento de mensagens do chat
 * - Fila offline para mensagens pendentes
 * - Retry com backoff exponencial
 * - Leitura e status de conexão
 */
export function useChatMessages({
  userId,
  tenantId,
  apiEndpoint,
  maxHistory = 100,
  offlineEnabled = true
}: UseChatMessagesConfig): UseChatMessagesReturn {
  // Estado das mensagens
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>('connected')
  const [queue, setQueue] = useState<ChatMessage[]>([])
  
  // Refs para controle interno
  const messagesRef = useRef(messages)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3
  const isOnline = useRef(true)

  // Atualiza ref de messages
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Detecção de online/offline
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true
      setConnectionStatus('connected')
      processQueue()
    }

    const handleOffline = () => {
      isOnline.current = false
      setConnectionStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Processa fila de mensagens offline
  const processQueue = useCallback(async () => {
    if (queue.length === 0 || !isOnline.current) return

    const messageToSend = queue[0]
    setQueue(prev => prev.slice(1))

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesRef.current.map(({ role, content }) => ({ role, content })),
          userId,
          storeId: tenantId,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
          isRead: false,
        },
      ])
    } catch (error) {
      // Re-adiciona na fila em caso de erro
      setQueue(prev => [messageToSend, ...prev])
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageToSend.id ? { ...msg, isError: true } : msg
        )
      )
    }
  }, [queue, apiEndpoint, userId, tenantId])

  // Envia mensagem
  const sendMessage = useCallback(async (content: string) => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isTyping) return

    // Cria mensagem do usuário
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedContent,
      timestamp: new Date(),
      isRead: true,
    }

    // Adiciona mensagem do usuário
    setMessages(prev => [...prev.slice(-(maxHistory - 1)), userMessage])
    setIsTyping(true)

    // Modo offline
    if (!isOnline.current && offlineEnabled) {
      setQueue(prev => [...prev, userMessage])
      setIsTyping(false)
      return
    }

    try {
      const history = messagesRef.current.map(({ role, content: msgContent }) => ({
        role,
        content: msgContent,
      }))

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          userId,
          storeId: tenantId,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      // Adiciona resposta do assistente
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply || 'Desculpe, não entendi sua mensagem.',
          timestamp: new Date(),
          isRead: false,
        },
      ])

      reconnectAttempts.current = 0
    } catch (error) {
      // Retry com backoff exponencial
      reconnectAttempts.current += 1
      
      if (reconnectAttempts.current <= maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000)
        
        setTimeout(() => {
          sendMessage(content)
        }, delay)
        return
      }

      // Erro após todas as tentativas
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Desculpe, tive um problema de conexão. Tente novamente em instantes! 🔄',
          timestamp: new Date(),
          isError: true,
          isRead: false,
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }, [apiEndpoint, userId, tenantId, maxHistory, offlineEnabled, isTyping])

  // Marca mensagem como lida
  const markAsRead = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, isRead: true } : msg
      )
    )
  }, [])

  // Limpa mensagens
  const clearMessages = useCallback(() => {
    setMessages([])
    setQueue([])
    reconnectAttempts.current = 0
  }, [])

  // Retry da última mensagem
  const retryLastMessage = useCallback(async () => {
    const lastErrorIndex = messagesRef.current
      .map(msg => msg.isError)
      .lastIndexOf(true)

    if (lastErrorIndex === -1) return

    const errorMessage = messagesRef.current[lastErrorIndex]
    await sendMessage(errorMessage.content)
    
    // Remove mensagem de erro
    setMessages(prev => prev.filter(msg => msg.id !== errorMessage.id))
  }, [sendMessage])

  return {
    messages,
    isTyping,
    connectionStatus,
    sendMessage,
    markAsRead,
    clearMessages,
    retryLastMessage,
    queueLength: queue.length,
  }
}

export default useChatMessages
