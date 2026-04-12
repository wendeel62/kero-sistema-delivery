import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface Pedido {
  id: string
  numero: number
  cliente_nome: string
  total: number
  status: string
  canal: string
  created_at: string
  updated_at: string
}

interface AnaliseData {
  positivos: string[]
  atencao: string[]
  sugestoes: Array<{ titulo: string; descricao: string; action: string }>
}

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: Date
}

interface RelatorioDiario {
  id: string
  data: string
  status: 'enviado' | 'falhou'
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  aberto: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  pendente: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  confirmado: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500' },
  preparando: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  pronto: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  saiu_entrega: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500' },
  entregue: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  cancelado: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container p-4 rounded-xl animate-pulse">
      <div className="h-4 bg-surface-container-high rounded w-3/4 mb-2" />
      <div className="h-3 bg-surface-container-high rounded w-1/2" />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.novo
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${colors.bg} ${colors.text} border-l-2 ${colors.border}`}>
      {status}
    </span>
  )
}

function PedidoCard({ pedido, compact = false }: { pedido: Pedido; compact?: boolean }) {
  if (compact) {
    return (
      <div className="bg-surface p-3 rounded-xl border border-outline-variant/10 flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-primary">#{String(pedido.numero).padStart(4, '0')}</span>
          <p className="text-sm font-medium text-on-surface truncate">{pedido.cliente_nome}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={pedido.status} />
          <span className="text-green-400 font-bold text-sm">R$ {Number(pedido.total).toFixed(2)}</span>
          <span className="text-xs text-on-surface-variant">
            {format(parseISO(pedido.updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface p-4 rounded-xl border border-outline-variant/10 shadow-lg hover:border-primary/30 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-bold text-primary">#{String(pedido.numero).padStart(4, '0')}</span>
          <h3 className="font-bold text-on-surface">{pedido.cliente_nome}</h3>
        </div>
        <StatusBadge status={pedido.status} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-green-400 font-bold text-lg">R$ {Number(pedido.total).toFixed(2)}</span>
        <span className="text-xs text-on-surface-variant">
          {format(parseISO(pedido.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
      </div>
    </div>
  )
}

export default function GestorWhatsAppPage() {
  const { user } = useAuth()
  const tenantId = user?.id
  const [activeTab, setActiveTab] = useState<'operador' | 'gestor' | 'pedidos'>('pedidos')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const fetchPedidosAtivos = useCallback(async (): Promise<Pedido[]> => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, total, status, canal, created_at, updated_at')
      .eq('canal', 'whatsapp')
      .not('status', 'in', '("entregue","cancelado","novo")')
      .order('updated_at', { ascending: false })
      .limit(50)
    return data || []
  }, [])

  const fetchHistorico = useCallback(async (): Promise<Pedido[]> => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, total, status, canal, created_at, updated_at')
      .eq('canal', 'whatsapp')
      .in('status', ['entregue', 'cancelado'])
      .order('updated_at', { ascending: false })
      .limit(10)
    return data || []
  }, [])

  const { data: pedidosAtivos, refetch: refetchAtivos } = useQuery({
    queryKey: ['pedidos-ativos-whatsapp'],
    queryFn: fetchPedidosAtivos,
  })

  const { data: historico, refetch: refetchHistorico } = useQuery({
    queryKey: ['historico-whatsapp'],
    queryFn: fetchHistorico,
  })

  useRealtime('pedidos', () => {
    refetchAtivos()
  })

  const { data: analiseData, isLoading: loadingAnalise, refetch: refetchAnalise, error: analiseError } = useQuery({
    queryKey: ['consultor-analise'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { modo: 'analise' }
      })
      if (error) throw error
      return data as AnaliseData
    },
    enabled: activeTab === 'gestor',
  })

  const sendChatMessage = async () => {
    if (!chatInput.trim() || sendingMessage) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setSendingMessage(true)

    try {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { mensagem: chatInput.trim(), modo: 'chat' }
      })

      if (!error && data?.resposta) {
        const agentMessage: ChatMessage = {
          role: 'agent',
          content: data.resposta,
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, agentMessage])
      }
    } catch (err) {
      console.error('Erro no chat:', err)
    } finally {
      setSendingMessage(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const { data: relatorios, isLoading: loadingRelatorios } = useQuery({
    queryKey: ['relatorios-diarios'],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('relatorios_diarios')
          .select('*')
          .order('data', { ascending: false })
          .limit(5)
        return (data || []) as RelatorioDiario[]
      } catch {
        return [] as RelatorioDiario[]
      }
    },
    enabled: activeTab === 'gestor',
  })

  const resendRelatorio = useMutation({
    mutationFn: async (data: string) => {
      const { error } = await supabase.functions.invoke('relatorio-diario', {
        body: { data }
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-diarios'] })
    }
  })

  const executarSugestao = useMutation({
    mutationFn: async ({ titulo, action }: { titulo: string; action: string }) => {
      try {
        await supabase.from('historico_agente').insert({
          tenant_id: tenantId,
          tipo: 'executado',
          descricao: titulo,
          executado_em: new Date().toISOString()
        })
      } catch {
        console.log('Erro ao registrar execução')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-analise'] })
      refetchAnalise()
    }
  })

  const ignorarSugestao = useMutation({
    mutationFn: async (titulo: string) => {
      try {
        await supabase.from('historico_agente').insert({
          tenant_id: tenantId,
          tipo: 'ignorado',
          descricao: titulo
        })
      } catch {
        console.log('Erro ao registrar ignorar')
      }
    },
    onSuccess: () => {
      refetchAnalise()
    }
  })

  const handleExecuteAction = (titulo: string, action: string) => {
    console.log('Executando:', action)
    executarSugestao.mutate({ titulo, action })
  }

  const handleIgnoreAction = (titulo: string) => {
    ignorarSugestao.mutate(titulo)
  }

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col p-4 md:p-8 animate-fade-in bg-background">
      <header className="mb-6">
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tighter">Gestor WhatsApp</h1>
        <p className="text-on-surface-variant mt-1">Gerenciamento de pedidos e assistente virtual</p>
      </header>

      <div className="flex gap-2 mb-6 border-b border-outline-variant/10">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'pedidos'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          PEDIDOS
        </button>
        <button
          onClick={() => setActiveTab('gestor')}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'gestor'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          GESTOR CONSULTOR
        </button>
      </div>

      {activeTab === 'pedidos' && (
        <div className="flex-1 overflow-y-auto space-y-8">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-green-400">chat</span>
                Pedidos Ativos
              </h2>
              <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                Realtime ativo
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidosAtivos?.map(pedido => (
                <PedidoCard key={pedido.id} pedido={pedido} />
              ))}
              {pedidosAtivos?.length === 0 && (
                <div className="col-span-full text-center py-8 opacity-50">
                  <span className="material-symbols-outlined text-4xl">inbox</span>
                  <p className="text-sm mt-2">Nenhum pedido ativo</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">history</span>
                Histórico Recente
              </h2>
              <button
                onClick={() => refetchHistorico()}
                className="px-3 py-1 text-xs font-bold bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Atualizar
              </button>
            </div>
            <div className="space-y-2">
              {historico?.map(pedido => (
                <PedidoCard key={pedido.id} pedido={pedido} compact />
              ))}
              {historico?.length === 0 && (
                <div className="text-center py-8 opacity-50">
                  <span className="material-symbols-outlined text-4xl">inbox</span>
                  <p className="text-sm mt-2">Nenhum histórico</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'gestor' && (
        <div className="flex-1 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingAnalise ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : analiseError ? (
              <div className="col-span-3 bg-error/10 border border-error/20 rounded-xl p-4 text-center">
                <p className="text-error text-sm mb-2">Erro ao carregar análise</p>
                <button
                  onClick={() => refetchAnalise()}
                  className="px-4 py-2 bg-error text-on-error rounded-lg text-sm font-bold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                <div className="bg-green-500/5 border-l-4 border-green-500 rounded-xl p-4">
                  <h3 className="font-bold text-green-400 flex items-center gap-2 mb-3">
                    <span>✅</span> Pontos Positivos
                  </h3>
                  <ul className="space-y-2">
                    {analiseData?.positivos?.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        {item}
                      </li>
                    ))}
                    {(!analiseData?.positivos || analiseData.positivos.length === 0) && (
                      <li className="text-sm text-on-surface-variant opacity-50">Nenhum ponto positivo registrado</li>
                    )}
                  </ul>
                </div>

                <div className="bg-yellow-500/5 border-l-4 border-yellow-500 rounded-xl p-4">
                  <h3 className="font-bold text-yellow-400 flex items-center gap-2 mb-3">
                    <span>⚠️</span> Pontos de Atenção
                  </h3>
                  <ul className="space-y-2">
                    {analiseData?.atencao?.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        {item}
                      </li>
                    ))}
                    {(!analiseData?.atencao || analiseData.atencao.length === 0) && (
                      <li className="text-sm text-on-surface-variant opacity-50">Nenhum ponto de atenção</li>
                    )}
                  </ul>
                </div>

                <div className="bg-orange-500/5 border-l-4 border-orange-500 rounded-xl p-4">
                  <h3 className="font-bold text-orange-400 flex items-center gap-2 mb-3">
                    <span>🎯</span> Sugestões de Ação
                  </h3>
                  <div className="space-y-3">
                    {analiseData?.sugestoes?.map((item, i) => (
                      <div key={i} className="bg-surface-container p-3 rounded-lg">
                        <p className="font-bold text-sm text-on-surface">{item.titulo}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{item.descricao}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleExecuteAction(item.titulo, item.action)}
                            className="px-3 py-1 bg-[#e8391a] text-white text-xs font-bold rounded hover:bg-[#e8391a]/80 transition-colors"
                          >
                            Executar
                          </button>
                          <button
                            onClick={() => handleIgnoreAction(item.titulo)}
                            className="px-3 py-1 border border-outline-variant text-on-surface-variant text-xs font-bold rounded hover:bg-surface-container-high transition-colors"
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!analiseData?.sugestoes || analiseData.sugestoes.length === 0) && (
                      <p className="text-sm text-on-surface-variant opacity-50">Nenhuma sugestão</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4">Chat Livre</h2>
            <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-on-surface-variant opacity-50 py-8">
                    <span className="material-symbols-outlined text-4xl">chat</span>
                    <p className="text-sm mt-2">Envie uma mensagem para começar</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-xl ${
                          msg.role === 'user'
                            ? 'bg-[#e8391a] text-white'
                            : 'bg-[#252830] text-on-surface'
                        }`}
                      >
                        {msg.role === 'agent' && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            <span className="text-xs font-bold opacity-70">Assistente</span>
                          </div>
                        )}
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-outline-variant/10 flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendChatMessage()
                    }
                  }}
                  placeholder="Digite sua mensagem..."
                  disabled={sendingMessage}
                  className="flex-1 bg-surface-container-high p-3 rounded-xl text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary resize-none h-12 max-h-24"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={sendingMessage || !chatInput.trim()}
                  className="px-4 py-2 bg-[#e8391a] text-white font-bold rounded-xl hover:bg-[#e8391a]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                >
                  {sendingMessage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Enviar'
                  )}
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4">Relatórios Diários</h2>
            <div className="space-y-2">
              {loadingRelatorios ? (
                <SkeletonCard />
              ) : relatorios && relatorios.length > 0 ? (
                relatorios.map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-surface p-4 rounded-xl border border-outline-variant/10 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant">
                        description
                      </span>
                      <div>
                        <p className="font-bold text-on-surface">
                          {format(parseISO(rel.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            rel.status === 'enviado'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {rel.status === 'enviado' ? 'Enviado' : 'Falhou'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => resendRelatorio.mutate(rel.data)}
                      disabled={resendRelatorio.isPending}
                      className="px-3 py-1 text-xs font-bold bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors"
                    >
                      {resendRelatorio.isPending ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Reenviar'
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 opacity-50 bg-surface-container/30 rounded-xl">
                  <span className="material-symbols-outlined text-4xl">description</span>
                  <p className="text-sm mt-2">Nenhum relatório enviado ainda.</p>
                  <p className="text-xs text-on-surface-variant mt-1">O primeiro será enviado hoje às 23h.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
