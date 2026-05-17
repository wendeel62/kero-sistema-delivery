import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatActionPayload, ChatConnectionStatus } from '../../types'

/**
 * Contexto da loja para envio à API
 */
interface StoreContext {
  isFirstAccess?: boolean
  todayRevenue?: number
  totalOrders?: number
  categories?: Array<{ id: string; nome: string }>
  [key: string]: unknown
}

/**
 * Retorno da API de chat
 */
interface ChatApiResponse {
  reply: string
  pendingAction?: ChatActionPayload
  context?: StoreContext
}

/**
 * Configurações do hook
 */
interface UseChatIntegrationsConfig {
  userId: string
  tenantId: string
  apiEndpoint: string
  context?: StoreContext
  onTypingStart?: () => void
  onTypingEnd?: () => void
  onActionReceived?: (action: ChatActionPayload) => void
  onError?: (error: Error) => void
}

/**
 * Retorno do hook
 */
interface UseChatIntegrationsReturn {
  sendMessage: (messages: Array<{ role: string; content: string }>) => Promise<ChatApiResponse | null>
  confirmAction: (action: ChatActionPayload, confirmed: boolean) => Promise<string | null>
  isProcessing: boolean
  connectionStatus: ChatConnectionStatus
  lastError: Error | null
  retryCount: number
}

/**
 * Hook para integrações com APIs de IA
 * - Gerencia comunicação com Supabase Functions
 * - Processa ações pendentes
 * - Controla retry com backoff exponencial
 */
export function useChatIntegrations({
  userId,
  tenantId,
  apiEndpoint,
  context,
  onTypingStart,
  onTypingEnd,
  onActionReceived,
  onError,
}: UseChatIntegrationsConfig): UseChatIntegrationsReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>('connected')
  const [lastError, setLastError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const isOnline = useRef(true)

  // Monitora conexão
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true
      setConnectionStatus('connected')
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

  // Envia mensagem para API
  const sendMessage = useCallback(async (
    messages: Array<{ role: string; content: string }>
  ): Promise<ChatApiResponse | null> => {
    if (!isOnline.current) {
      setConnectionStatus('offline')
      return null
    }

    setIsProcessing(true)
    onTypingStart?.()
    setLastError(null)

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          userId,
          storeId: tenantId,
          context,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ChatApiResponse = await response.json()

      // Processa ação pendente
      if (data.pendingAction && onActionReceived) {
        onActionReceived(data.pendingAction)
      }

      retryCountRef.current = 0
      setRetryCount(0)
      setConnectionStatus('connected')
      
      return data
    } catch (error) {
      const err = error as Error
      setLastError(err)
      onError?.(err)

      // Retry com backoff exponencial
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1
        setRetryCount(retryCountRef.current)
        
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000)
        
        // Reconecta em caso de erro de rede
        if (connectionStatus === 'offline') {
          setConnectionStatus('reconnecting')
          
          const checkConnection = setInterval(() => {
            if (isOnline.current) {
              clearInterval(checkConnection)
              setConnectionStatus('connected')
              sendMessage(messages)
            }
          }, 2000)

          return null
        }

        // Aguarda e retry
        await new Promise(resolve => setTimeout(resolve, delay))
        return sendMessage(messages)
      }

      setConnectionStatus('connected')
      return {
        reply: 'Desculpe, tive um problema de conexão. Tente novamente em instantes! 🔄',
      }
    } finally {
      setIsProcessing(false)
      onTypingEnd?.()
    }
  }, [apiEndpoint, userId, tenantId, context, onTypingStart, onTypingEnd, onActionReceived, onError, connectionStatus])

  // Confirma ação pendente
  const confirmAction = useCallback(async (
    action: ChatActionPayload,
    confirmed: boolean
  ): Promise<string | null> => {
    if (!confirmed) {
      return 'Ação cancelada. Posso ajudar com mais alguma coisa?'
    }

    setIsProcessing(true)
    onTypingStart?.()

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          storeId: tenantId,
          context,
          pendingAction: { ...action, confirmed: true },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ChatApiResponse = await response.json()
      return data.reply
    } catch (error) {
      const err = error as Error
      setLastError(err)
      onError?.(err)
      return null
    } finally {
      setIsProcessing(false)
      onTypingEnd?.()
    }
  }, [apiEndpoint, userId, tenantId, context, onTypingStart, onTypingEnd, onError])

  return {
    sendMessage,
    confirmAction,
    isProcessing,
    connectionStatus,
    lastError,
    retryCount,
  }
}

export default useChatIntegrations
