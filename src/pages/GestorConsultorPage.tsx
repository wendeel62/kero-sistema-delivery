import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface Pedido {
  id: string
  numero: number
  cliente_nome: string
  status: string
  total: number
  updated_at: string
  created_at: string
  tipo: string
}

interface AnaliseData {
  positivos: string[]
  atencao: string[]
  sugestoes: Array<{ titulo: string; descricao: string; action: string }>
}

interface RelatorioDiario {
  id: string
  data: string
  status: 'enviado' | 'falhou'
}

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
}

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  em_preparo: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  preparando: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  pronto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  saiu_entrega: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  entregue: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container/30 rounded-2xl p-6 animate-pulse">
      <div className="h-6 bg-surface-container rounded w-1/2 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-surface-container rounded w-3/4" />
        <div className="h-4 bg-surface-container rounded w-1/2" />
        <div className="h-4 bg-surface-container rounded w-2/3" />
      </div>
    </div>
  )
}

function formatDatePtBR(dateStr: string) {
  return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function formatTimestampPtBR(dateStr: string) {
  return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export default function GestorConsultorPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const tenantId = user?.id
  
  const [activeTab, setActiveTab] = useState<'operacional' | 'gestor'>('operacional')
  const [pedidosRealtime, setPedidosRealtime] = useState<Pedido[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const fetchPedidosRealtime = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, status, total, updated_at, canal')
      .eq('tenant_id', tenantId)
      .eq('canal', 'whatsapp')
      .not('status', 'in', `('entregue','cancelado','novo')`)
      .order('updated_at', { ascending: false })
      .limit(10)
    
    if (data) setPedidosRealtime(data)
  }, [tenantId])

  useEffect(() => {
    fetchPedidosRealtime()
  }, [fetchPedidosRealtime])

  useRealtime('pedidos', () => {
    fetchPedidosRealtime()
  })

  const { data: historicoData, isLoading: historicoLoading, refetch: refetchHistorico } = useQuery({
    queryKey: ['historico-whatsapp', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data } = await supabase
        .from('pedidos')
        .select('id, numero, cliente_nome, status, total, updated_at, canal')
        .eq('tenant_id', tenantId)
        .eq('canal', 'whatsapp')
        .in('status', ['entregue', 'cancelado'])
        .order('updated_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!tenantId,
  })

  const { data: analiseData, isLoading: analiseLoading, error: analiseError, refetch: refetchAnalise } = useQuery({
    queryKey: ['analise-consultant', tenantId],
    queryFn: async (): Promise<AnaliseData> => {
      if (!tenantId) throw new Error('No tenant')
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, modo: 'analise' }
      })
      if (error) throw error
      return data
    },
    enabled: activeTab === 'gestor' && !!tenantId,
  })

  const { data: relatoriosData, isLoading: relatoriosLoading, refetch: refetchRelatorios } = useQuery({
    queryKey: ['relatorios-diarios', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data, error } = await supabase
        .from('relatorios_diarios')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('data', { ascending: false })
        .limit(5)
      if (error) {
        console.error('Erro ao buscar relatórios:', error)
        return []
      }
      return (data || []) as RelatorioDiario[]
    },
    enabled: activeTab === 'gestor' && !!tenantId,
  })

  const enviarChatMutation = useMutation({
    mutationFn: async (mensagem: string) => {
      if (!tenantId) throw new Error('No tenant')
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, mensagem, modo: 'chat' }
      })
      if (error) throw error
      return data
    },
  })

  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat) return
    
    const userMessage = chatInput.trim()
    setChatInput('')
    setSendingChat(true)
    
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      const response = await enviarChatMutation.mutateAsync(userMessage)
      if (response?.resposta) {
        setChatMessages(prev => [...prev, { role: 'agent', content: response.resposta }])
      }
    } catch (err) {
      console.error('Erro no chat:', err)
    } finally {
      setSendingChat(false)
    }
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleExecutarSugestao = async (titulo: string, _action: string) => {
    if (!tenantId) return
    
    await supabase.from('historico_agente').insert({
      tenant_id: tenantId,
      tipo: 'executado',
      descricao: titulo,
      executado_em: new Date().toISOString()
    })
    
    if (analiseData) {
      queryClient.setQueryData(['analise-consultant', tenantId], {
        ...analiseData,
        sugestoes: analiseData.sugestoes.filter(s => s.titulo !== titulo)
      })
    }
  }

  const handleIgnorarSugestao = async (titulo: string) => {
    if (!tenantId) return
    
    await supabase.from('historico_agente').insert({
      tenant_id: tenantId,
      tipo: 'ignorado',
      descricao: titulo
    })
    
    if (analiseData) {
      queryClient.setQueryData(['analise-consultant', tenantId], {
        ...analiseData,
        sugestoes: analiseData.sugestoes.filter(s => s.titulo !== titulo)
      })
    }
  }

  const handleReenviarRelatorio = async (data: string) => {
    if (!tenantId) return
    await supabase.functions.invoke('relatorio-diario', {
      body: { tenant_id: tenantId, data }
    })
    refetchRelatorios()
  }

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col p-4 md:p-8 animate-fade-in bg-background">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tighter">Gestor Consultor</h1>
          <p className="text-on-surface-variant font-body mt-1">Análise inteligente e gestão operacional</p>
        </div>
        
        <div className="flex bg-surface-container rounded-xl p-1">
          <button
            onClick={() => setActiveTab('operacional')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'operacional'
                ? 'bg-primary text-on-primary shadow-lg'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Painel Operacional
          </button>
          <button
            onClick={() => setActiveTab('gestor')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'gestor'
                ? 'bg-primary text-on-primary shadow-lg'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Gestor Consultor
          </button>
        </div>
      </header>

      {activeTab === 'operacional' ? (
        <div className="flex-1 overflow-y-auto space-y-8">
          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">chat</span>
              Pedidos WhatsApp Ativos
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">Tempo Real</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidosRealtime.length === 0 ? (
                <div className="col-span-full text-center py-12 opacity-40">
                  <span className="material-symbols-outlined text-6xl">inbox</span>
                  <p className="mt-2 font-bold">Nenhum pedido ativo</p>
                </div>
              ) : (
                pedidosRealtime.map(pedido => (
                  <div key={pedido.id} className="bg-surface rounded-2xl p-5 border border-outline-variant/10 hover:border-primary/20 transition-all shadow-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-primary uppercase">#{String(pedido.numero).padStart(4, '0')}</span>
                        <h3 className="font-headline font-bold text-on-surface">{pedido.cliente_nome}</h3>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[pedido.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {pedido.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 font-headline font-bold text-lg">
                        R$ {Number(pedido.total).toFixed(2)}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        {formatTimestampPtBR(pedido.updated_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                Histórico Recente
              </h2>
              <button
                onClick={() => refetchHistorico()}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-sm font-bold text-on-surface-variant transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Atualizar
              </button>
            </div>
            
            <div className="space-y-2">
              {historicoLoading ? (
                <div className="text-center py-8 opacity-40">Carregando...</div>
              ) : historicoData?.length === 0 ? (
                <div className="text-center py-12 opacity-40">
                  <span className="material-symbols-outlined text-6xl">history</span>
                  <p className="mt-2 font-bold">Nenhum histórico disponível</p>
                </div>
              ) : (
                historicoData?.map(pedido => (
                  <div key={pedido.id} className="bg-surface-container/50 rounded-xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-primary">#{String(pedido.numero).padStart(4, '0')}</span>
                      <span className="text-sm text-on-surface">{pedido.cliente_nome}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[pedido.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {pedido.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-green-400 font-bold">{Number(pedido.total).toFixed(2)}</span>
                      <span className="text-xs text-on-surface-variant">{formatDatePtBR(pedido.updated_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-8">
          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Análise do Consultor
            </h2>
            
            {analiseLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : analiseError ? (
              <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-4xl text-error">error</span>
                <p className="text-error text-center">Erro ao carregar análise</p>
                <button
                  onClick={() => refetchAnalise()}
                  className="px-6 py-2 bg-error text-on-error rounded-xl font-bold hover:bg-error/80 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-500/5 border-l-4 border-green-500 rounded-2xl p-6">
                  <h3 className="font-headline font-bold text-green-400 flex items-center gap-2 mb-4">
                    <span className="text-xl">✅</span> Pontos Positivos
                  </h3>
                  <ul className="space-y-2">
                    {analiseData?.positivos?.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-yellow-500/5 border-l-4 border-yellow-500 rounded-2xl p-6">
                  <h3 className="font-headline font-bold text-yellow-400 flex items-center gap-2 mb-4">
                    <span className="text-xl">⚠️</span> Pontos de Atenção
                  </h3>
                  <ul className="space-y-2">
                    {analiseData?.atencao?.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-yellow-500 mt-1">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-500/5 border-l-4 border-orange-500 rounded-2xl p-6">
                  <h3 className="font-headline font-bold text-orange-400 flex items-center gap-2 mb-4">
                    <span className="text-xl">🎯</span> Sugestões de Ação
                  </h3>
                  <div className="space-y-4">
                    {analiseData?.sugestoes?.map((sugestao, i) => (
                      <div key={i} className="bg-surface-container rounded-xl p-4 space-y-3">
                        <div>
                          <h4 className="font-bold text-on-surface text-sm">{sugestao.titulo}</h4>
                          <p className="text-xs text-on-surface-variant mt-1">{sugestao.descricao}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExecutarSugestao(sugestao.titulo, sugestao.action)}
                            className="flex-1 py-2 bg-[#e8391a] text-white rounded-lg text-xs font-bold hover:bg-[#e8391a]/80 transition-colors"
                          >
                            Executar
                          </button>
                          <button
                            onClick={() => handleIgnorarSugestao(sugestao.titulo)}
                            className="flex-1 py-2 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container transition-colors"
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-surface-container/30 rounded-2xl p-6">
            <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">chat</span>
              Chat Livre
            </h3>
            
            <div 
              ref={chatContainerRef}
              className="bg-[#1a1d24] rounded-xl p-4 mb-4 max-h-[400px] overflow-y-auto space-y-4"
            >
              {chatMessages.length === 0 ? (
                <div className="text-center text-on-surface-variant/40 py-8">
                  <span className="material-symbols-outlined text-4xl">smart_toy</span>
                  <p className="mt-2 text-sm">Como posso ajudar?</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-[#e8391a] text-white rounded-br-md'
                          : 'bg-[#252830] text-on-surface rounded-bl-md flex items-start gap-2'
                      }`}
                    >
                      {msg.role === 'agent' && (
                        <span className="material-symbols-outlined text-lg shrink-0">smart_toy</span>
                      )}
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendChat()
                  }
                }}
                placeholder="Digite sua mensagem..."
                disabled={sendingChat}
                className="flex-1 bg-surface-container rounded-xl p-3 text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary resize-none h-12 min-h-[48px]"
              />
              <button
                onClick={handleSendChat}
                disabled={sendingChat || !chatInput.trim()}
                className="px-6 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {sendingChat ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined">send</span>
                )}
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">description</span>
              Relatórios Diários
            </h2>
            
            {relatoriosLoading ? (
              <div className="text-center py-8 opacity-40">Carregando...</div>
            ) : relatoriosData?.length === 0 ? (
              <div className="text-center py-12 bg-surface-container/30 rounded-2xl opacity-40">
                <span className="material-symbols-outlined text-6xl">description</span>
                <p className="mt-2 font-bold">Nenhum relatório enviado ainda</p>
                <p className="text-sm text-on-surface-variant">O primeiro será enviado hoje às 23h</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relatoriosData?.map((relatorio) => (
                  <div key={relatorio.id} className="bg-surface-container/50 rounded-xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-on-surface-variant">
                        description
                      </span>
                      <span className="text-sm text-on-surface">{formatDatePtBR(relatorio.data)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        relatorio.status === 'enviado' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {relatorio.status === 'enviado' ? 'Enviado' : 'Falhou'}
                      </span>
                    </div>
                    {relatorio.status === 'falhou' && (
                      <button
                        onClick={() => handleReenviarRelatorio(relatorio.data)}
                        className="px-4 py-2 bg-surface hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant transition-colors"
                      >
                        Reenviar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
