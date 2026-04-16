import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Search, 
  MessageSquare, 
  Phone, 
  Video, 
  MoreVertical, 
  Send,
  Check,
  CheckCheck,
  Clock,
  User,
  ExternalLink
} from 'lucide-react'

// Tipagens baseadas na tabela mensagens_whatsapp
interface WhatsAppMessage {
  id: string
  tenant_id: string
  contato_telefone: string
  contato_nome: string | null
  mensagem: string
  direcao: 'entrada' | 'saida'
  lida: boolean
  created_at: string
}

// Interface para conversa agrupada
interface Conversa {
  telefone: string
  nome: string
  ultimaMensagem: string
  timestamp: string
  naoLidas: number
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Função para formatar data
const formatarData = (dateStr: string): string => {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: ptBR })
  }
  if (isYesterday(date)) {
    return 'Ontem'
  }
  return format(date, 'dd/MM', { locale: ptBR })
}

// Função para limpar telefone (remove @s.whatsapp.net se houver)
const limparTelefone = (telefone: string): string => {
  return telefone.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

function getTenantId(): string {
  const configStr = localStorage.getItem('supabase.auth.token')
  if (configStr) {
    try {
      const config = JSON.parse(configStr)
      return config.access_token?.user_metadata?.tenant_id || config.user?.user_metadata?.tenant_id || ''
    } catch {
      return ''
    }
  }
  return ''
}

export default function WhatsappInboxPage() {
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantId()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Estado para o contato atualmente selecionado (telefone)
  const [contatoAtivo, setContatoAtivo] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // CONSULTA 1: Lista de conversas (últimas 200 mensagens)
  // ============================================
  const { data: mensagensRecentes, isLoading: carregandoConversas } = useQuery<WhatsAppMessage[]>({
    queryKey: ['whatsapp-conversas', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data, error } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(200)
      
      if (error) throw error
      return data || []
    },
    staleTime: 0,
    enabled: !!tenantId
  })

  // ============================================
  // AGRUPAMENTO: Montar lista de conversas no frontend
  // ============================================
  const conversas: Conversa[] = useMemo(() => {
    if (!mensagensRecentes) return []
    
    const mapa = new Map<string, WhatsAppMessage>()
    
    // Pegar a primeira ocorrência de cada telefone (mais recente)
    for (const msg of mensagensRecentes) {
      const telefone = limparTelefone(msg.contato_telefone)
      if (!mapa.has(telefone)) {
        mapa.set(telefone, msg)
      }
    }
    
    // Converter para array de conversas
    const conversasArray: Conversa[] = []
    
    for (const [telefone, msg] of mapa) {
      // Contar não lidas deste contato
      const naoLidas = mensagensRecentes.filter(
        m => limparTelefone(m.contato_telefone) === telefone && !m.lida && m.direcao === 'entrada'
      ).length
      
      conversasArray.push({
        telefone,
        nome: msg.contato_nome || telefone,
        ultimaMensagem: msg.mensagem,
        timestamp: msg.created_at,
        naoLidas
      })
    }
    
    // Ordenar por timestamp (mais recente primeiro)
    return conversasArray.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [mensagensRecentes])

  // ============================================
  // FILTRO: Busca por nome ou telefone
  // ============================================
  const conversasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return conversas
    const term = searchTerm.toLowerCase()
    return conversas.filter(c => 
      c.nome.toLowerCase().includes(term) || 
      c.telefone.includes(term)
    )
  }, [conversas, searchTerm])

  // CONSULTA 2: Mensagens do contato ativo
  // ============================================
  const { data: mensagensContato, isLoading: carregandoMensagens } = useQuery<WhatsAppMessage[]>({
    queryKey: ['whatsapp-mensagens', contatoAtivo, tenantId],
    queryFn: async () => {
      if (!contatoAtivo || !tenantId) return []
      
      const { data, error } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`contato_telefone.eq.${contatoAtivo},contato_telefone.like.${contatoAtivo}@%`)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    staleTime: 0,
    enabled: !!contatoAtivo && !!tenantId
  })

  // MUTAÇÃO: Marcar mensagens como lidas
  // ============================================
  const mutationMarcarLida = useMutation({
    mutationFn: async (telefone: string) => {
      if (!tenantId) return
      // Buscar mensagens não lidas deste contato
      const { data: msgs } = await supabase
        .from('mensagens_whatsapp')
        .select('id')
        .eq('tenant_id', tenantId)
        .or(`contato_telefone.eq.${telefone},contato_telefone.like.${telefone}@%`)
        .eq('lida', false)
        .eq('direcao', 'entrada')
      
      if (msgs && msgs.length > 0) {
        const ids = msgs.map(m => m.id)
        const { error } = await supabase
          .from('mensagens_whatsapp')
          .update({ lida: true })
          .in('id', ids)
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      // Invalidar query de conversas para atualizar badges
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas', tenantId] })
    }
  })

  // ============================================
  // EFFECT: Quando muda o contato ativo, marcar como lido
  // ============================================
  useEffect(() => {
    if (contatoAtivo) {
      mutationMarcarLida.mutate(contatoAtivo)
    }
  }, [contatoAtivo])

  // ============================================
  // EFFECT: Scroll automático para o fim das mensagens
  // ============================================
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensagensContato])

  // ============================================
  // REALTIME: Escutar novas mensagens
  // ============================================
  useEffect(() => {
    const channel = supabase
      .channel(`whatsapp-inbox-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_whatsapp',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          // Invalidar query de conversas
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas', tenantId] })
          
          // Se a mensagem for do contato ativo, invalidar também
          const novaMsg = payload.new as WhatsAppMessage
          if (contatoAtivo && limparTelefone(novaMsg.contato_telefone) === contatoAtivo) {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', contatoAtivo, tenantId] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, contatoAtivo, tenantId])

  // ============================================
  // SELEÇÃO DE CONTATO
  // ============================================
  const handleSelecionarConversa = (telefone: string) => {
    setContatoAtivo(telefone)
  }

  // ============================================
  // DADOS DO CONTATO ATIVO
  // ============================================
  const contatoSelecionado = useMemo(() => {
    return conversas.find(c => c.telefone === contatoAtivo) || null
  }, [conversas, contatoAtivo])

  // ============================================
  // RENDERIZAÇÃO
  // ============================================
  return (
    <div className="h-[calc(100vh-100px)] w-full flex overflow-hidden rounded-2xl glass border border-outline/10 shadow-2xl animate-fade-in text-on-surface">
      
      {/* COLUNA ESQUERDA - Lista de Conversas */}
      <div className="w-80 md:w-96 flex flex-col border-r border-outline/10 bg-surface-container-low/50">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-surface-container/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <User className="text-primary w-6 h-6" />
            </div>
            <h2 className="font-headline font-bold text-lg">Conversas</h2>
          </div>
          <button className="p-2 hover:bg-surface-container-high rounded-full transition-smooth text-on-surface-variant">
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Barra de busca */}
        <div className="p-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-smooth" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar conversa..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-high/50 border border-outline/10 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-smooth"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {carregandoConversas ? (
            <div className="p-8 text-center opacity-50">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm">Carregando...</p>
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="p-8 text-center opacity-40">
              <MessageSquare size={32} className="mx-auto mb-2" />
              <p className="text-sm">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
            </div>
          ) : (
            conversasFiltradas.map((conversa) => (
              <div 
                key={conversa.telefone}
                onClick={() => handleSelecionarConversa(conversa.telefone)}
                className={`
                  flex items-center gap-3 p-4 cursor-pointer transition-smooth relative
                  ${contatoAtivo === conversa.telefone ? 'bg-primary/10 border-r-2 border-primary' : 'hover:bg-surface-container-high/30'}
                `}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(conversa.nome)}&background=random&color=fff`} 
                    alt={conversa.nome} 
                    className="w-12 h-12 rounded-full border border-outline/10"
                  />
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-headline font-bold text-on-surface truncate">{conversa.nome}</h3>
                    <span className={`text-[10px] ${conversa.naoLidas > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {formatarData(conversa.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-on-surface-variant truncate pr-2">
                      {conversa.ultimaMensagem.length > 40 
                        ? conversa.ultimaMensagem.substring(0, 40) + '...' 
                        : conversa.ultimaMensagem}
                    </p>
                    {conversa.naoLidas > 0 && (
                      <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse flex-shrink-0">
                        {conversa.naoLidas}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUNA DIREITA - Conversa Aberta */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        {contatoAtivo && mensagensContato ? (
          <>
            {/* Header da conversa */}
            <div className="p-4 flex justify-between items-center bg-surface-container/50 backdrop-blur-md border-b border-outline/10 z-10">
              <div className="flex items-center gap-3">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contatoSelecionado?.nome || contatoAtivo)}&background=random&color=fff`} 
                  alt={contatoSelecionado?.nome} 
                  className="w-10 h-10 rounded-full border border-outline/10"
                />
                <div>
                  <h3 className="font-headline font-bold text-on-surface leading-tight">
                    {contatoSelecionado?.nome || contatoAtivo}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant">
                    {contatoAtivo}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 md:gap-3">
                <button className="p-2 hover:bg-surface-container-high rounded-full transition-smooth text-on-surface-variant hover:text-primary">
                  <Video size={20} />
                </button>
                <button className="p-2 hover:bg-surface-container-high rounded-full transition-smooth text-on-surface-variant hover:text-primary">
                  <Phone size={20} />
                </button>
                <a 
                  href={`https://web.whatsapp.com/send?phone=${contatoAtivo}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-surface-container-high rounded-full transition-smooth text-on-surface-variant hover:text-primary"
                  title="Abrir no WhatsApp Web"
                >
                  <ExternalLink size={20} />
                </a>
                <button className="p-2 hover:bg-surface-container-high rounded-full transition-smooth text-on-surface-variant">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Container de mensagens */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar z-10">
              {carregandoMensagens ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {mensagensContato.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`
                        max-w-[80%] md:max-w-[70%] p-3 rounded-2xl relative shadow-lg
                        ${msg.direcao === 'saida' 
                          ? 'bg-primary text-white rounded-tr-sm' 
                          : 'bg-surface-container text-on-surface rounded-tl-sm border border-outline/10'}
                      `}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.mensagem}</p>
                        <div className={`flex items-center gap-1 mt-1 justify-end opacity-70`}>
                          <span className="text-[9px] font-bold">
                            {formatarData(msg.created_at)} {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                          </span>
                          {msg.direcao === 'saida' && (
                            <span>
                              {msg.lida ? <CheckCheck size={12} className="text-cyan-300" /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Área de input (apenas visual, sem funcionalidade de envio) */}
            <div className="p-4 bg-surface-container/50 backdrop-blur-md border-t border-outline/10 z-10">
              <div className="flex items-center gap-2 md:gap-4 max-w-5xl mx-auto">
                <div className="flex-1 bg-surface-container-high/50 text-on-surface-variant border border-outline/10 rounded-2xl py-3 px-4 text-sm">
                  Envio de mensagens não implementado
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Estado vazio - nenhuma conversa selecionada */
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center p-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 animate-float">
              <MessageSquare className="text-primary w-10 h-10" />
            </div>
            <h2 className="font-headline font-bold text-2xl mb-2">Selecione uma conversa</h2>
            <p className="text-on-surface-variant max-w-xs mx-auto text-sm">
              Clique em um contato na barra lateral para ver as mensagens.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}