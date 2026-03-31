import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface Mensagem {
  id: string
  tenant_id: string
  contato_telefone: string
  contato_nome: string | null
  direcao: 'recebida' | 'enviada'
  conteudo: string
  midia_url: string | null
  midia_tipo: string | null
  twilio_message_sid: string | null
  pedido_id: string | null
  lida: boolean
  agente_respondeu: boolean | null
  created_at: string
}

interface ContatoAgrupado {
  telefone: string
  nome: string | null
  ultimaMensagem: Mensagem
  mensagens: Mensagem[]
  naoLidas: number
}

const AVATAR_COLORS = [
  '#e8391a', '#f57c24', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1'
]

function getAvatarColor(telefone: string): string {
  let hash = 0
  for (let i = 0; i < telefone.length; i++) {
    hash = telefone.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(nome: string | null, telefone: string): string {
  if (nome && nome.trim()) {
    const parts = nome.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return nome.substring(0, 2).toUpperCase()
  }
  return telefone.substring(0, 2)
}

function formatarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`
  }
  if (digits.length === 11) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`
  }
  return telefone
}

function formatarTimestamp(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) {
    return format(date, 'HH:mm')
  }
  if (isYesterday(date)) {
    return 'Ontem'
  }
  return format(date, 'dd/MM')
}

function formatarDataConversa(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) {
    return 'Hoje'
  }
  if (isYesterday(date)) {
    return 'Ontem'
  }
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function isAgenteRespondendo(mensagem: Mensagem): boolean {
  if (mensagem.direcao !== 'recebida') return false
  const msgDate = parseISO(mensagem.created_at)
  const now = new Date()
  const diffMs = now.getTime() - msgDate.getTime()
  const diffSegundos = Math.floor(diffMs / 1000)
  return diffSegundos < 30
}

function shouldGroupWithPrevious(mensagem: Mensagem, msgAnterior: Mensagem | null): boolean {
  if (!msgAnterior) return false
  if (msgAnterior.direcao !== mensagem.direcao) return false
  
  const msgDate = parseISO(mensagem.created_at)
  const prevDate = parseISO(msgAnterior.created_at)
  const diffMs = msgDate.getTime() - prevDate.getTime()
  const diffSegundos = Math.floor(diffMs / 1000)
  
  return diffSegundos < 60
}

export default function WhatsappInboxPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const tenantId = user?.id
  
  const [contatoSelecionado, setContatoSelecionado] = useState<ContatoAgrupado | null>(null)
  const [busca, setBusca] = useState('')
  const [mobileView, setMobileView] = useState<'lista' | 'conversa'>('lista')
  const mensagensEndRef = useRef<HTMLDivElement>(null)
  const [mostrarIndicador, setMostrarIndicador] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileView('conversa')
      } else if (!contatoSelecionado) {
        setMobileView('lista')
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [contatoSelecionado])

  const { data: mensagens, isLoading } = useQuery({
    queryKey: ['mensagens-whatsapp', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
      return (data || []) as Mensagem[]
    },
    enabled: !!tenantId,
  })

  const contatosAgrupados = useMemo(() => {
    if (!mensagens) return []
    
    const grupos: Record<string, ContatoAgrupado> = {}
    
    mensagens.forEach((msg) => {
      if (!grupos[msg.contato_telefone]) {
        grupos[msg.contato_telefone] = {
          telefone: msg.contato_telefone,
          nome: msg.contato_nome,
          ultimaMensagem: msg,
          mensagens: [],
          naoLidas: 0,
        }
      }
      grupos[msg.contato_telefone].mensagens.push(msg)
      if (!msg.lida && msg.direcao === 'recebida') {
        grupos[msg.contato_telefone].naoLidas++
      }
      if (new Date(msg.created_at) > new Date(grupos[msg.contato_telefone].ultimaMensagem.created_at)) {
        grupos[msg.contato_telefone].ultimaMensagem = msg
      }
    })
    
    return Object.values(grupos).sort((a, b) => 
      new Date(b.ultimaMensagem.created_at).getTime() - new Date(a.ultimaMensagem.created_at).getTime()
    )
  }, [mensagens])

  const contatosFiltrados = useMemo(() => {
    if (!busca.trim()) return contatosAgrupados
    const lower = busca.toLowerCase()
    return contatosAgrupados.filter(c => 
      (c.nome && c.nome.toLowerCase().includes(lower)) ||
      c.telefone.includes(lower)
    )
  }, [contatosAgrupados, busca])

  const marcarComoLida = useMutation({
    mutationFn: async (telefone: string) => {
      if (!tenantId) return
      await supabase
        .from('mensagens_whatsapp')
        .update({ lida: true })
        .eq('tenant_id', tenantId)
        .eq('contato_telefone', telefone)
        .eq('lida', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensagens-whatsapp', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas', tenantId] })
    },
  })

  useEffect(() => {
    if (contatoSelecionado) {
      marcarComoLida.mutate(contatoSelecionado.telefone)
    }
  }, [contatoSelecionado?.telefone])

  useEffect(() => {
    if (contatoSelecionado && mensagens) {
      const ultMsg = contatoSelecionado.mensagens[contatoSelecionado.mensagens.length - 1]
      if (ultMsg && isAgenteRespondendo(ultMsg)) {
        setMostrarIndicador(true)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setMostrarIndicador(false)
        }, 30000)
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [contatoSelecionado, mensagens])

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [contatoSelecionado?.mensagens])

  useEffect(() => {
    if (!tenantId) return
    
    const channel = supabase
      .channel('mensagens-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_whatsapp',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['mensagens-whatsapp', tenantId] })
          queryClient.invalidateQueries({ queryKey: ['mensagens-nao-lidas', tenantId] })
          
          const novaMsg = payload.new as Mensagem
          if (contatoSelecionado && novaMsg.contato_telefone === contatoSelecionado.telefone) {
            setTimeout(() => {
              mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
            if (novaMsg.direcao === 'recebida') {
              setMostrarIndicador(true)
              if (timerRef.current) clearTimeout(timerRef.current)
              timerRef.current = setTimeout(() => {
                setMostrarIndicador(false)
              }, 30000)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, contatoSelecionado, queryClient])

  const handleSelecionarContato = (contato: ContatoAgrupado) => {
    setContatoSelecionado(contato)
    if (isMobile) {
      setMobileView('conversa')
    }
  }

  const handleVoltar = () => {
    setMobileView('lista')
    setContatoSelecionado(null)
  }

  const agruparMensagensPorData = (msgs: Mensagem[]) => {
    const grupos: { data: string; mensagens: Mensagem[] }[] = []
    let currentDate = ''
    
    msgs.forEach((msg) => {
      const msgDate = format(parseISO(msg.created_at), 'yyyy-MM-dd')
      if (msgDate !== currentDate) {
        currentDate = msgDate
        grupos.push({ data: msgDate, mensagens: [] })
      }
      grupos[grupos.length - 1].mensagens.push(msg)
    })
    
    return grupos
  }

  const temMensagens = mensagens && mensagens.length > 0

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0e1017' }}>
      {/* Painel Esquerdo */}
      <div 
        className={`flex-shrink-0 flex flex-col border-r ${isMobile ? 'w-full' : 'w-80'}`}
        style={{ 
          borderColor: '#252830', 
          backgroundColor: '#16181f',
          display: isMobile && mobileView === 'conversa' ? 'none' : 'flex'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: '#252830' }}>
          <div className="flex items-center justify-between">
            <h1 className="text-lg" style={{ fontFamily: 'Syne Bold', color: '#dde0ee' }}>
              WhatsApp
            </h1>
            <span 
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: 'rgba(232,57,26,0.15)', color: '#e8391a' }}
            >
              {contatosAgrupados.length} conversas
            </span>
          </div>
        </div>

        {/* Busca */}
        <div className="p-3">
          <div className="relative">
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
              style={{ color: '#dde0ee', opacity: 0.5 }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
              style={{ 
                backgroundColor: '#1e2028', 
                border: '1px solid #252830',
                color: '#dde0ee',
              }}
            />
          </div>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center" style={{ color: '#dde0ee', opacity: 0.5 }}>
              Carregando...
            </div>
          ) : !temMensagens ? (
            <div className="p-4 text-center" style={{ color: '#dde0ee', opacity: 0.5 }}>
              Nenhuma mensagem recebida ainda.<br />
              <span className="text-xs">Configure o Twilio para começar.</span>
            </div>
          ) : contatosFiltrados.length === 0 ? (
            <div className="p-4 text-center" style={{ color: '#dde0ee', opacity: 0.5 }}>
              {busca ? 'Nenhuma conversa encontrada' : 'Nenhuma mensagem ainda'}
            </div>
          ) : (
            contatosFiltrados.map((contato) => (
              <div
                key={contato.telefone}
                onClick={() => handleSelecionarContato(contato)}
                className="p-3 cursor-pointer transition-all border-l-4"
                style={{ 
                  backgroundColor: contatoSelecionado?.telefone === contato.telefone 
                    ? 'rgba(232,57,26,0.08)' 
                    : 'transparent',
                  borderColor: contatoSelecionado?.telefone === contato.telefone 
                    ? '#e8391a' 
                    : 'transparent',
                  paddingLeft: contatoSelecionado?.telefone === contato.telefone ? '11px' : '14px',
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(contato.telefone) }}
                  >
                    {getInitials(contato.nome, contato.telefone)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-medium text-sm truncate"
                        style={{ color: '#dde0ee' }}
                      >
                        {contato.nome || formatarTelefone(contato.telefone)}
                      </span>
                      <span className="text-xs flex-shrink-0" style={{ color: '#dde0ee', opacity: 0.5 }}>
                        {formatarTimestamp(contato.ultimaMensagem.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span 
                        className="text-xs truncate"
                        style={{ color: '#dde0ee', opacity: 0.6 }}
                      >
                        {contato.ultimaMensagem.midia_url 
                          ? '📎 Mídia' 
                          : contato.ultimaMensagem.conteudo.substring(0, 40) + (contato.ultimaMensagem.conteudo.length > 40 ? '...' : '')
                        }
                      </span>
                      {contato.naoLidas > 0 && (
                        <span 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: '#e8391a', color: '#fff' }}
                        >
                          {contato.naoLidas}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Painel Direito */}
      <div 
        className="flex-1 flex flex-col"
        style={{ 
          backgroundColor: '#0e1017',
          display: isMobile && mobileView === 'lista' ? 'none' : 'flex'
        }}
      >
        {!contatoSelecionado ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <svg 
              className="w-16 h-16 mb-4" 
              style={{ color: '#252830' }}
              fill="currentColor" viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-1.03 6.988-2.898 9.825-2.998a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <p className="text-sm" style={{ color: '#dde0ee', opacity: 0.5 }}>
              Selecione uma conversa
            </p>
          </div>
        ) : (
          <>
            {/* Header da Conversa */}
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: '#252830', backgroundColor: '#16181f' }}
            >
              <div className="flex items-center gap-3">
                {isMobile && (
                  <button
                    onClick={handleVoltar}
                    className="p-1 mr-1 rounded-lg transition-colors"
                    style={{ color: '#dde0ee' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: getAvatarColor(contatoSelecionado.telefone) }}
                >
                  {getInitials(contatoSelecionado.nome, contatoSelecionado.telefone)}
                </div>
                <div>
                  <h2 className="text-sm" style={{ fontFamily: 'Syne Bold', color: '#dde0ee' }}>
                    {contatoSelecionado.nome || formatarTelefone(contatoSelecionado.telefone)}
                  </h2>
                  <p className="text-xs" style={{ color: '#dde0ee', opacity: 0.5 }}>
                    {contatoSelecionado.mensagens.length} mensagens
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/55${contatoSelecionado.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{ 
                  backgroundColor: 'rgba(34,197,94,0.1)', 
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-1.03 6.988-2.898 9.825-2.998a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Abrir
              </a>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {agruparMensagensPorData(contatoSelecionado.mensagens).map((grupo) => (
                <div key={grupo.data}>
                  <div className="flex items-center justify-center my-4">
                    <div 
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ backgroundColor: '#1a1c24', color: '#dde0ee', opacity: 0.5 }}
                    >
                      {formatarDataConversa(grupo.data + 'T12:00:00')}
                    </div>
                  </div>
                  {grupo.mensagens.map((msg, idx) => {
                    const msgAnterior = idx > 0 ? grupo.mensagens[idx - 1] : null
                    const agrupar = shouldGroupWithPrevious(msg, msgAnterior)
                    const mostrarAvatar = !agrupar
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direcao === 'enviada' ? 'justify-end' : 'justify-start'} mb-1 animate-fadeInUp`}
                      >
                        {!agrupar && (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium mr-2 flex-shrink-0 self-end mb-1"
                            style={{ backgroundColor: getAvatarColor(contatoSelecionado.telefone) }}
                          >
                            {getInitials(contatoSelecionado.nome, contatoSelecionado.telefone)}
                          </div>
                        )}
                        {agrupar && msg.direcao === 'recebida' && <div className="w-8 mr-2" />}
                        <div 
                          className={`max-w-[70%] px-3 py-2 ${mostrarAvatar ? '' : 'pt-1'}`}
                          style={{ 
                            backgroundColor: msg.direcao === 'enviada' 
                              ? 'rgba(232,57,26,0.12)' 
                              : '#1e2028',
                            border: msg.direcao === 'enviada'
                              ? '1px solid rgba(232,57,26,0.2)'
                              : '1px solid #252830',
                            borderRadius: msg.direcao === 'enviada'
                              ? agrupar ? '12px 2px 12px 12px' : '12px 2px 12px 2px'
                              : agrupar ? '2px 12px 12px 12px' : '2px 12px 12px 12px',
                          }}
                        >
                          {msg.midia_url && (
                            <div className="mb-2">
                              <a
                                href={msg.midia_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs"
                                style={{ color: '#f57c24' }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                Abrir mídia
                              </a>
                            </div>
                          )}
                          <p className="text-sm" style={{ color: '#dde0ee', lineHeight: 1.5 }}>
                            {msg.conteudo}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {msg.direcao === 'enviada' && msg.agente_respondeu && (
                              <span className="text-[10px]" style={{ color: '#f57c24' }}>
                                Agente IA
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: '#dde0ee', opacity: 0.5 }}>
                              {format(parseISO(msg.created_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {mostrarIndicador && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f57c24', animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f57c24', animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f57c24', animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px]" style={{ color: '#f57c24' }}>
                    Agente IA respondendo...
                  </span>
                </div>
              )}
              <div ref={mensagensEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
