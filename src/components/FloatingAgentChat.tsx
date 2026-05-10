import React, { useState, useEffect, useRef } from 'react'
import AgentAvatar from './AgentAvatar'
import { useAgentContext } from '../hooks/useAgentContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isError?: boolean
}

interface ActionPayload {
  type: | 'create_product'
        | 'update_price'
        | 'toggle_product'
        | 'update_store_settings'
        | 'update_delivery_settings'
        | 'update_opening_hours'
        | 'update_payment_methods'
        | 'toggle_store_open'
  data: Record<string, unknown>
}

interface ChatProps {
  userId: string
  tenantId: string
  autoOpenOnLogin?: boolean
}

const SUPABASE_FUNCTION_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agent`

const DEFAULT_WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! 👋 Sou o Alex, seu assistente do KERO. Posso te ajudar com dúvidas sobre o cardápio digital, configurações ou qualquer coisa sobre a plataforma. Como posso ajudar?',
  timestamp: new Date(),
}

function buildWelcome(context: ReturnType<typeof useAgentContext>, greeting: string | null): Message {
  if (!context || !greeting) return DEFAULT_WELCOME
  return {
    id: 'welcome',
    role: 'assistant',
    content: greeting,
    timestamp: new Date(),
  }
}

function getActionDescription(action: ActionPayload, categories?: Array<{ id: string; nome: string }>): string {
  switch (action.type) {
    case 'create_product':
      const catName = categories?.find(c => c.id === action.data.category_id)?.nome || action.data.category_id || 'Sem categoria'
      return `Criar produto "${action.data.name as string}" por R$ ${Number(action.data.price).toFixed(2)} (${catName})`
    
    case 'update_price':
      return `Atualizar preço do produto para R$ ${Number(action.data.newPrice).toFixed(2)}`
    
    case 'toggle_product':
      return `${action.data.active ? 'Ativar' : 'Desativar'} o produto`
    
    case 'update_store_settings':
      const fields = []
      if (action.data.nome_loja) fields.push(`nome: "${action.data.nome_loja}"`)
      if (action.data.telefone) fields.push(`telefone: ${action.data.telefone}`)
      if (action.data.endereco) fields.push(`endereço: ${action.data.endereco}`)
      if (action.data.cidade) fields.push(`cidade: ${action.data.cidade}`)
      if (action.data.estado) fields.push(`estado: ${action.data.estado}`)
      return `Atualizar dados da loja: ${fields.join(', ')}`
    
    case 'update_delivery_settings':
      const dFields = []
      if (action.data.taxa_entrega !== undefined) dFields.push(`taxa entrega: R$ ${action.data.taxa_entrega}`)
      if (action.data.pedido_minimo !== undefined) dFields.push(`pedido mínimo: R$ ${action.data.pedido_minimo}`)
      if (action.data.raio_entrega_km !== undefined) dFields.push(`raio: ${action.data.raio_entrega_km}km`)
      return `Atualizar delivery: ${dFields.join(', ')}`
    
    case 'update_opening_hours':
      return `Alterar horário: ${action.data.horario_abertura} - ${action.data.horario_fechamento}`
    
    case 'update_payment_methods':
      const pMethods = []
      if (action.data.aceita_pix) pMethods.push('PIX')
      if (action.data.aceita_cartao) pMethods.push('Cartão')
      if (action.data.aceita_dinheiro) pMethods.push('Dinheiro')
      return `Atualizar pagamentos: ${pMethods.join(', ')}`
    
    case 'toggle_store_open':
      return action.data.open ? '🟢 ABRIR a loja' : '🔴 FECHAR a loja'
    
    default:
      return 'Executar ação no sistema'
  }
}

export default function FloatingAgentChat({ userId, tenantId, autoOpenOnLogin = false }: ChatProps) {
  const context = useAgentContext(tenantId)

  const [state, setState] = useState<{
    isOpen: boolean
    isTyping: boolean
    messages: Message[]
    inputValue: string
    hasGreeted: boolean
  }>({
    isOpen: false,
    isTyping: false,
    messages: [],
    inputValue: '',
    hasGreeted: false,
  })

  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Greeting message based on context
  const getDynamicWelcome = (): string => {
    if (!context) return DEFAULT_WELCOME.content
    if (context.isFirstAccess) {
      return `Olá! 👋 Bem-vindo ao KERO! Sou o Alex, seu assistente.
Vou te ajudar a configurar tudo para começar a vender. Vamos começar? 🚀`
    }
    if (context.todayRevenue > 0) {
      return `Olá! 👋 Bom dia! Vi que você já vendeu R$ ${context.todayRevenue.toFixed(2)} hoje — ${context.totalOrders} pedidos. Posso ajudar com alguma coisa?`
    }
    return DEFAULT_WELCOME.content
  }

  // Auto-open on login (once per day)
  useEffect(() => {
    if (!userId || !context || !autoOpenOnLogin) return

    const today = new Date().toISOString().split('T')[0]
    const loginKey = `alex_ greeted_${userId}_${today}`
    const alreadyGreeted = localStorage.getItem(loginKey)

    if (!alreadyGreeted) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, isOpen: true }))
      }, 2000)
      localStorage.setItem(loginKey, 'true')
      return () => clearTimeout(timer)
    }
  }, [userId, context, autoOpenOnLogin])

  // Show welcome when chat opens for the first time in a session
  useEffect(() => {
    if (state.isOpen && !state.hasGreeted) {
      setState(prev => ({ ...prev, isTyping: true }))

      const timer = setTimeout(() => {
        const welcome = buildWelcome(context, getDynamicWelcome())
        setState(prev => ({
          ...prev,
          isTyping: false,
          messages: [welcome],
          hasGreeted: true,
        }))
      }, 1200)

      return () => clearTimeout(timer)
    }
  }, [state.isOpen, state.hasGreeted, context])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages, state.isTyping, pendingAction])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [state.inputValue])

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const addMessage = (role: 'user' | 'assistant', content: string, isError = false) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      isError,
    }
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }))
  }

  const handleSend = async () => {
    const content = state.inputValue.trim()
    if (!content || state.isTyping) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setState(prev => ({
      ...prev,
      inputValue: '',
      isTyping: true,
    }))

    // history for API (role + content only)
    const history = [...state.messages, userMessage].map(({ role, content: msgContent }) => ({
      role,
      content: msgContent,
    }))

    try {
      const response = await fetch(SUPABASE_FUNCTION_, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, userId, storeId: tenantId, context }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        isTyping: false,
      }))

      // If agent returned a pending action, show confirmation card
      if (data.pendingAction) {
        setPendingAction(data.pendingAction)
      }
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Desculpe, tive um problema de conexão. Tente novamente em instantes! 🔄',
        timestamp: new Date(),
        isError: true,
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, errorMessage],
        isTyping: false,
      }))
    }
  }

  const handleConfirmAction = async (confirmed: boolean) => {
    if (!confirmed || !pendingAction) {
      setPendingAction(null)
      addMessage('assistant', 'Tudo bem! Ação cancelada. Posso ajudar com mais alguma coisa?')
      return
    }

    setState(prev => ({ ...prev, isTyping: true }))
    setPendingAction(null)

    const history = state.messages.map(({ role, content }) => ({ role, content }))

    try {
      const response = await fetch(SUPABASE_FUNCTION_, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          userId,
          storeId: tenantId,
          context,
          pendingAction: { ...pendingAction, confirmed: true },
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      setState(prev => ({ ...prev, isTyping: false }))
      addMessage('assistant', data.reply)
    } catch {
      setState(prev => ({ ...prev, isTyping: false }))
      addMessage('assistant', 'Desculpe, tive um problema ao executar a ação. Tente novamente! 🔄', true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleChat = () => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }

  const closeChat = () => {
    setState(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={toggleChat}
        className={`
          fixed bottom-5 right-4 z-[99] w-[52px] h-[52px] rounded-full
          bg-gradient-to-br from-slate-800 to-slate-900
          shadow-2xl border-2 border-orange-500
          flex items-center justify-center
          transition-all duration-200 ease-out hover:scale-110 active:scale-95
          ${!state.isOpen ? 'agent-fab-idle' : ''}
        `}
        aria-label="Abrir chat com Alex"
      >
        <AgentAvatar size={44} />
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 agent-dot-online" />
        {state.messages.length === 0 && !state.hasGreeted && (
          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-orange-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
            <span className="text-xs font-bold text-white">1</span>
          </div>
        )}
      </button>

      {/* Painel de Chat */}
      {state.isOpen && (
        <div
          className="flex flex-col fixed bottom-[88px] right-4 z-[98]
            w-[min(360px,calc(100vw-32px))] h-[min(500px,calc(100vh-120px))]
            bg-slate-900 rounded-2xl overflow-hidden shadow-2xl
            border border-slate-700
            chat-open"
        >
          {/* Header */}
          <div className="flex-shrink-0 h-[60px] bg-gradient-to-r from-slate-800 to-slate-700 border-b border-orange-500/20 p-4 flex items-center gap-3">
            <AgentAvatar size={36} />
            <div className="flex-1">
              <div className="font-semibold text-slate-200 text-sm">Alex</div>
              <div className="flex items-center gap-1 text-xs text-green-400">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full agent-dot-online" />
                Online
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={closeChat} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors" aria-label="Fechar chat">
                <span className="material-symbols-outlined text-slate-400 text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 gap-2 bg-slate-950">
            {state.messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-2 max-w-[85%] ${
                  message.role === 'assistant' ? 'self-start' : 'self-end flex-row-reverse'
                } message-enter`}
              >
                {message.role === 'assistant' && <AgentAvatar size={24} />}
                <div
                  className={`rounded-2xl px-3 py-2 max-w-full break-words ${
                    message.role === 'assistant'
                      ? `bg-slate-800 border border-orange-500/15 text-slate-200 ${message.isError ? 'border-red-500/30 bg-red-950/50' : ''}`
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                  }`}
                >
                  <div className="text-[13px] leading-[1.45] whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-1 ${message.role === 'assistant' ? 'text-slate-400 text-right' : 'text-orange-100 text-right'}`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {state.isTyping && (
              <div className="flex gap-2 self-start message-enter">
                <AgentAvatar size={24} />
                <div className="bg-slate-800 border border-orange-500/15 rounded-2xl px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-orange-500 rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-orange-500 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Card de Confirmação de Ação */}
          {pendingAction && (
            <div className="flex-shrink-0 mx-3 mb-2 p-3 bg-slate-800 border border-orange-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-400 text-sm">⚡</span>
                <span className="text-[13px] text-slate-200 font-medium">Alex quer executar:</span>
              </div>
              <p className="text-[12px] text-slate-300 mb-3">{getActionDescription(pendingAction, context?.categories)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirmAction(true)}
                  className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition"
                >
                  ✅ Confirmar
                </button>
                <button
                  onClick={() => handleConfirmAction(false)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 px-3 py-3 bg-slate-900 border-t border-orange-500/15 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={state.inputValue}
              onChange={e => setState(prev => ({ ...prev, inputValue: e.target.value }))}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-h-[44px] max-h-24 resize-none bg-slate-800 border border-orange-500/20 rounded-xl px-3 py-2 text-[13px] text-slate-200 placeholder-slate-400 outline-none focus:border-orange-500/50 transition-colors"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!state.inputValue.trim() || state.isTyping}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                state.inputValue.trim() && !state.isTyping
                  ? 'bg-orange-500 hover:bg-orange-600 hover:scale-105 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              aria-label="Enviar mensagem"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}