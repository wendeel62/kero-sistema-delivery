import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { useAuth } from '../contexts/AuthContext'

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
}

interface RelatorioDiario {
  id: string
  tenant_id: string
  data: string
  status: 'enviado' | 'falhou'
  criado_em: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  novo: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  em_preparo: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  preparando: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  pendente: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  confirmado: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  aberto: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  pronto: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  saiu_entrega: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  entregue: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  cancelado: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  em_preparo: 'Em Preparo',
  preparando: 'Preparando',
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  aberto: 'Aberto',
  pronto: 'Pronto',
  saiu_entrega: 'Saiu para Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
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

function SkeletonCard() {
  return (
    <div className="bg-surface p-4 rounded-xl border border-outline-variant/10 animate-pulse">
      <div className="h-4 bg-surface-container rounded w-3/4 mb-3" />
      <div className="h-3 bg-surface-container rounded w-1/2 mb-2" />
      <div className="h-3 bg-surface-container rounded w-2/3" />
    </div>
  )
}

function PedidoCard({ pedido }: { pedido: Pedido }) {
  const colors = STATUS_COLORS[pedido.status] || STATUS_COLORS.novo
  const updatedAt = parseISO(pedido.updated_at)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - updatedAt.getTime()) / 60000)
  
  let timeDisplay: string
  if (diffMinutes < 60) {
    timeDisplay = `${diffMinutes}m`
  } else if (diffMinutes < 1440) {
    timeDisplay = `${Math.floor(diffMinutes / 60)}h`
  } else {
    timeDisplay = format(updatedAt, "dd/MM HH:mm", { locale: ptBR })
  }

  return (
    <div className="bg-surface p-4 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all shadow-lg">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-headline font-bold text-sm text-on-surface truncate" title={pedido.cliente_nome}>
            {pedido.cliente_nome}
          </h4>
          <span className="text-xs text-on-surface-variant">#{String(pedido.numero).padStart(4, '0')}</span>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
          {STATUS_LABELS[pedido.status] || pedido.status}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-green-400 font-headline font-bold text-lg">
          R$ {Number(pedido.total).toFixed(2)}
        </span>
        <span className="text-xs text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">schedule</span>
          {timeDisplay}
        </span>
      </div>
    </div>
  )
}

function PedidoCardCompact({ pedido }: { pedido: Pedido }) {
  const colors = STATUS_COLORS[pedido.status] || STATUS_COLORS.entregue
  const updatedAt = parseISO(pedido.updated_at)
  
  return (
    <div className="bg-surface p-3 rounded-xl border border-outline-variant/10 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <span className="text-xs text-on-surface-variant">#{String(pedido.numero).padStart(4, '0')}</span>
        <span className="font-bold text-sm text-on-surface truncate max-w-[150px]">{pedido.cliente_nome}</span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${colors.bg} ${colors.text}`}>
          {STATUS_LABELS[pedido.status] || pedido.status}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-green-400 font-bold text-sm">R$ {Number(pedido.total).toFixed(2)}</span>
        <span className="text-xs text-on-surface-variant">
          {format(updatedAt, "dd/MM", { locale: ptBR })}
        </span>
      </div>
    </div>
  )
}

export default function WhatsAppOrdersPage() {
  const [activeTab, setActiveTab] = useState<'operacional' | 'gestor'>('operacional')
  const [pedidosAtivos, setPedidosAtivos] = useState<Pedido[]>([])
  const [loadingAtivos, setLoadingAtivos] = useState(true)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantId()

  const fetchPedidosAtivos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('canal', 'whatsapp')
        .not('status', 'in', '("entregue","cancelado","novo")')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setPedidosAtivos(data || [])
    } catch (err) {
      console.error('Erro ao buscar pedidos ativos:', err)
      setPedidosAtivos([])
    } finally {
      setLoadingAtivos(false)
    }
  }, [])

  useEffect(() => {
    fetchPedidosAtivos()
  }, [fetchPedidosAtivos])

  useRealtime<Pedido>('pedidos', () => {
    fetchPedidosAtivos()
  })

  const { data: historicoRecente, isLoading: loadingHistorico, refetch: refetchHistorico } = useQuery({
    queryKey: ['whatsapp-historico', tenantId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('pedidos')
          .select('*')
          .eq('canal', 'whatsapp')
          .in('status', ['entregue', 'cancelado'])
          .order('updated_at', { ascending: false })
          .limit(10)

        if (error) throw error
        return data || []
      } catch {
        return []
      }
    },
    enabled: !!tenantId,
  })

  const { data: analiseData, isLoading: loadingAnalise, error: erroAnalise, refetch: refetchAnalise } = useQuery({
    queryKey: ['consultant-analise', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, modo: 'analise' }
      })
      if (error) throw error
      return data as AnaliseData
    },
    enabled: !!tenantId && activeTab === 'gestor',
  })

  const { data: relatorios, isLoading: loadingRelatorios, refetch: refetchRelatorios } = useQuery({
    queryKey: ['relatorios-diarios', tenantId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('relatorios_diarios')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('data', { ascending: false })
          .limit(5)

        if (error) throw error
        return data || []
      } catch {
        return [] as RelatorioDiario[]
      }
    },
    enabled: !!tenantId && activeTab === 'gestor',
  })

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const sendChatMessage = async () => {
    if (!chatInput.trim() || sendingMessage) return
    
    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setSendingMessage(true)

    try {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, mensagem: chatInput.trim(), modo: 'chat' }
      })

      if (error) throw error

      const agentMessage: ChatMessage = { role: 'agent', content: data?.resposta || 'Erro ao obter resposta.' }
      setChatMessages(prev => [...prev, agentMessage])
    } catch {
      setChatMessages(prev => [...prev, { role: 'agent', content: 'Erro ao enviar mensagem. Tente novamente.' }])
    } finally {
      setSendingMessage(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const { mutate: executarSugestao, isPending: executandoSugestao } = useMutation({
    mutationFn: async (sugestao: { titulo: string; descricao: string; action: string }) => {
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'executado',
        descricao: sugestao.titulo,
        executado_em: new Date().toISOString()
      })
      return sugestao
    },
    onSuccess: (sugestao) => {
      queryClient.setQueryData<AnaliseData | undefined>(['consultant-analise', tenantId], (old) => {
        if (!old) return old
        return {
          ...old,
          sugestoes: old.sugestoes.filter(s => s.titulo !== sugestao.titulo)
        }
      })
    }
  })

  const { mutate: ignorarSugestao } = useMutation({
    mutationFn: async (sugestao: { titulo: string; descricao: string; action: string }) => {
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'ignorado',
        descricao: sugestao.titulo
      })
      return sugestao
    },
    onSuccess: (sugestao) => {
      queryClient.setQueryData<AnaliseData | undefined>(['consultant-analise', tenantId], (old) => {
        if (!old) return old
        return {
          ...old,
          sugestoes: old.sugestoes.filter(s => s.titulo !== sugestao.titulo)
        }
      })
    }
  })

  const { mutate: reenviarRelatorio, isPending: reenviandoRelatorio } = useMutation({
    mutationFn: async (data: string) => {
      const { data: result, error } = await supabase.functions.invoke('relatorio-diario', {
        body: { tenant_id: tenantId, data }
      })
      if (error) throw error
      return result
    },
    onSuccess: () => {
      refetchRelatorios()
    }
  })

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col p-4 md:p-6 animate-fade-in">
      <header className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tighter">WhatsApp</h1>
          <p className="text-on-surface-variant text-sm">Gerenciamento de pedidos via WhatsApp</p>
        </div>
      </header>

      <div className="flex gap-2 mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('operacional')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'operacional'
              ? 'bg-primary text-on-primary shadow-lg'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Operacional
        </button>
        <button
          onClick={() => setActiveTab('gestor')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'gestor'
              ? 'bg-primary text-on-primary shadow-lg'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Gestor Consultor
        </button>
      </div>

      {activeTab === 'operacional' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0 mb-6">
            <h2 className="text-lg font-headline font-bold text-on-surface shrink-0">Pedidos Ativos</h2>
            {loadingAtivos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : pedidosAtivos.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">inbox</span>
                <p className="text-on-surface-variant mt-2">Nenhum pedido ativo no momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pedidosAtivos.map(pedido => (
                  <PedidoCard key={pedido.id} pedido={pedido} />
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-headline font-bold text-on-surface">Histórico Recente</h2>
              <button
                onClick={() => refetchHistorico()}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface-variant transition-colors"
              >
                Atualizar
              </button>
            </div>
            {loadingHistorico ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : !historicoRecente || historicoRecente.length === 0 ? (
              <div className="text-center py-8 bg-surface-container/30 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">history</span>
                <p className="text-on-surface-variant text-sm mt-2">Nenhum histórico recente</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {historicoRecente.map(pedido => (
                  <PedidoCardCompact key={pedido.id} pedido={pedido} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gestor' && (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingAnalise ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : erroAnalise ? (
              <div className="md:col-span-3 bg-error/10 border border-error/20 p-4 rounded-xl">
                <p className="text-error text-sm font-bold">Erro ao carregar análise</p>
                <button
                  onClick={() => refetchAnalise()}
                  className="mt-2 px-3 py-1.5 bg-error text-on-error rounded-lg text-xs font-bold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                <div className="bg-green-500/5 border-l-4 border-green-500 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">✅</span>
                    <h3 className="font-headline font-bold text-green-400">Pontos Positivos</h3>
                  </div>
                  <ul className="space-y-2">
                    {analiseData?.positivos?.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-yellow-500/5 border-l-4 border-yellow-500 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">⚠️</span>
                    <h3 className="font-headline font-bold text-yellow-400">Pontos de Atenção</h3>
                  </div>
                  <ul className="space-y-2">
                    {analiseData?.atencao?.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-500/5 border-l-4 border-orange-500 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🎯</span>
                    <h3 className="font-headline font-bold text-orange-400">Sugestões de Ação</h3>
                  </div>
                  <div className="space-y-3">
                    {analiseData?.sugestoes?.map((sugestao, i) => (
                      <div key={i} className="bg-surface p-3 rounded-lg border border-outline-variant/10">
                        <h4 className="font-bold text-sm text-on-surface">{sugestao.titulo}</h4>
                        <p className="text-xs text-on-surface-variant mt-1">{sugestao.descricao}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => executarSugestao(sugestao)}
                            disabled={executandoSugestao}
                            className="flex-1 py-1.5 bg-[#e8391a] text-white rounded-lg text-xs font-bold hover:bg-[#e8391a]/80 transition-colors disabled:opacity-50"
                          >
                            Executar
                          </button>
                          <button
                            onClick={() => ignorarSugestao(sugestao)}
                            className="flex-1 py-1.5 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container transition-colors"
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10">
            <h3 className="font-headline font-bold text-on-surface mb-4">Chat Livre</h3>
            <div className="h-[400px] overflow-y-auto space-y-3 mb-4 bg-[#1a1d24] p-3 rounded-xl">
              {chatMessages.length === 0 ? (
                <p className="text-center text-on-surface-variant text-sm py-8">
                  Tire dúvidas sobre seu negócio com o assistente IA
                </p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-[#e8391a] text-white rounded-br-md'
                          : 'bg-[#252830] text-on-surface rounded-bl-md flex items-start gap-2'
                      }`}
                    >
                      {msg.role === 'agent' && (
                        <span className="material-symbols-outlined text-sm shrink-0">smart_toy</span>
                      )}
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
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
                className="flex-1 bg-surface-container p-3 rounded-xl text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary resize-none h-12 min-h-[48px]"
              />
              <button
                onClick={sendChatMessage}
                disabled={sendingMessage || !chatInput.trim()}
                className="px-4 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {sendingMessage ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Enviar'
                )}
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-headline font-bold text-on-surface mb-4">Relatórios Diários</h3>
            {loadingRelatorios ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : !relatorios || relatorios.length === 0 ? (
              <div className="text-center py-8 bg-surface-container/30 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">description</span>
                <p className="text-on-surface-variant text-sm mt-2">
                  Nenhum relatório enviado ainda. O primeiro será enviado hoje às 23h.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {relatorios.map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-surface p-3 rounded-xl border border-outline-variant/10 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-on-surface">
                        {format(parseISO(rel.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rel.status === 'enviado'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {rel.status === 'enviado' ? 'Enviado' : 'Falhou'}
                      </span>
                    </div>
                    <button
                      onClick={() => reenviarRelatorio(rel.data)}
                      disabled={reenviandoRelatorio}
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant transition-colors disabled:opacity-50"
                    >
                      {reenviandoRelatorio ? 'Enviando...' : 'Reenviar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
