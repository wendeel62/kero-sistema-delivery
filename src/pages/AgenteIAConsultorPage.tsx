import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../contexts/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface Pedido {
  id: string
  numero: number
  cliente_nome: string
  total: number
  status: string
  canal: string
  updated_at: string
  created_at: string
}

interface AnaliseData {
  positivos: string[]
  atencao: string[]
  sugestoes: Array<{
    titulo: string
    descricao: string
    action: string
  }>
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
}

interface RelatorioDiario {
  id: string
  tenant_id?: string
  data: string
  status: 'enviado' | 'falhou'
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string; border: string }> = {
  aberto: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Aberto', border: 'border-blue-500' },
  pendente: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Pendente', border: 'border-blue-500' },
  confirmado: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Confirmado', border: 'border-blue-500' },
  preparando: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Preparando', border: 'border-orange-500' },
  pronto: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Pronto', border: 'border-purple-500' },
  saiu_entrega: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Saiu para Entrega', border: 'border-purple-500' },
  novo: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Novo', border: 'border-blue-500' },
  entregue: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Entregue', border: 'border-green-500' },
  cancelado: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelado', border: 'border-red-500' },
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-surface-container-high rounded-xl" />
        <div className="h-5 w-32 bg-surface-container-high rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-surface-container-high rounded" />
        <div className="h-4 w-3/4 bg-surface-container-high rounded" />
        <div className="h-4 w-5/6 bg-surface-container-high rounded" />
      </div>
    </div>
  )
}

function formatDatePtBR(dateStr: string) {
  return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR })
}

function formatDateTimePtBR(dateStr: string) {
  return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export default function AgenteIAConsultorPage() {
  const { user } = useAuth()
  const tenantId = user?.id || ''
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'gestor'>('whatsapp')
  const [pedidosAtivos, setPedidosAtivos] = useState<Pedido[]>([])
  const [loadingAtivos, setLoadingAtivos] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const fetchPedidosAtivos = useCallback(async (): Promise<Pedido[]> => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, total, status, canal, updated_at, created_at')
      .eq('canal', 'whatsapp')
      .not('status', 'in', '("entregue","cancelado","novo")')
      .order('updated_at', { ascending: false })
    return data || []
  }, [])

  useEffect(() => {
    const loadAtivos = async () => {
      setLoadingAtivos(true)
      const data = await fetchPedidosAtivos()
      setPedidosAtivos(data)
      setLoadingAtivos(false)
    }
    loadAtivos()
  }, [fetchPedidosAtivos])

  useRealtime<Pedido>('pedidos', () => {
    fetchPedidosAtivos().then(setPedidosAtivos)
  })

  const { data: historicoRecente, isLoading: loadingHistorico, refetch: refetchHistorico, isRefetching: isRefetchingHistorico } = useQuery({
    queryKey: ['historico-whatsapp', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('id, numero, cliente_nome, total, status, canal, updated_at, created_at')
        .eq('canal', 'whatsapp')
        .in('status', ['entregue', 'cancelado'])
        .order('updated_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!tenantId,
  })

  const { data: analiseData, isLoading: loadingAnalise, error: analiseError, refetch: refetchAnalise } = useQuery({
    queryKey: ['analise-consultor', tenantId],
    queryFn: async (): Promise<AnaliseData> => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, modo: 'analise' }
      })
      if (error) throw error
      return data as AnaliseData
    },
    enabled: !!tenantId && activeTab === 'gestor',
    retry: 1,
  })

  const [sugestoesLocais, setSugestoesLocais] = useState<AnaliseData['sugestoes']>([])
  const [resendingRelatorios, setResendingRelatorios] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (analiseData?.sugestoes) {
      setSugestoesLocais(analiseData.sugestoes)
    }
  }, [analiseData])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const sendChatMessage = async () => {
    if (!chatInput.trim() || sendingMessage || !tenantId) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setSendingMessage(true)

    try {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, mensagem: chatInput.trim(), modo: 'chat' }
      })

      if (error) throw error

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data?.resposta || data?.message || 'Resposta do agente',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Erro no chat:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setSendingMessage(false)
    }
  }

  const handleExecutarSugestao = async (index: number, titulo: string, action: string) => {
    try {
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'executado',
        descricao: titulo,
        executado_em: new Date().toISOString()
      })

      setSugestoesLocais(prev => prev.filter((_, i) => i !== index))
      
      try {
        if (action) {
          await supabase.functions.invoke('consultant-agent', {
            body: { tenant_id: tenantId, action: action, modo: 'executar' }
          })
        }
      } catch (e) {
        console.log('Action execution:', action)
      }
      
      queryClient.invalidateQueries({ queryKey: ['analise-consultant'] })
    } catch (err) {
      console.error('Erro ao executar ação:', err)
    }
  }

  const handleIgnorarSugestao = async (index: number, titulo: string) => {
    try {
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'ignorado',
        descricao: titulo
      })

      setSugestoesLocais(prev => prev.filter((_, i) => i !== index))
    } catch (err) {
      console.error('Erro ao ignorar:', err)
    }
  }

  const { data: relatoriosDiarios, isLoading: loadingRelatorios } = useQuery({
    queryKey: ['relatorios-diarios', tenantId],
    queryFn: async (): Promise<RelatorioDiario[]> => {
      try {
        const { data, error } = await supabase
          .from('relatorios_diarios')
          .select('id, data, status')
          .order('data', { ascending: false })
          .limit(5)
        if (error) throw error
        return (data || []).map(r => ({ ...r, status: r.status as 'enviado' | 'falhou' }))
      } catch {
        return []
      }
    },
    enabled: !!tenantId && activeTab === 'gestor',
  })

  const reenviarRelatorio = async (dataRelatorio: string) => {
    setResendingRelatorios(prev => ({ ...prev, [dataRelatorio]: true }))
    try {
      await supabase.functions.invoke('relatorio-diario', {
        body: { tenant_id: tenantId, data: dataRelatorio }
      })
      queryClient.invalidateQueries({ queryKey: ['relatorios-diarios'] })
    } catch (err) {
      console.error('Erro ao reenviar:', err)
    } finally {
      setResendingRelatorios(prev => ({ ...prev, [dataRelatorio]: false }))
    }
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col p-4 md:p-8 animate-fade-in bg-background">
      <header className="mb-6">
        <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tighter">Gestor IA</h1>
        <p className="text-on-surface-variant font-body mt-1">Assistente inteligente para gestão do seu delivery.</p>
      </header>

      <div className="flex gap-2 mb-6 border-b border-outline-variant/10 pb-1">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-6 py-3 rounded-t-xl font-bold text-sm transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-primary-container text-primary border-t border-x border-primary/20'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">chat</span>
            WhatsApp
          </span>
        </button>
        <button
          onClick={() => setActiveTab('gestor')}
          className={`px-6 py-3 rounded-t-xl font-bold text-sm transition-all ${
            activeTab === 'gestor'
              ? 'bg-primary-container text-primary border-t border-x border-primary/20'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">psychology</span>
            Gestor Consultor
          </span>
        </button>
      </div>

      {activeTab === 'whatsapp' && (
        <div className="flex-1 overflow-y-auto space-y-8">
          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">pending_actions</span>
              Pedidos Ativos
              <span className="text-xs font-normal text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">
                {pedidosAtivos.length}
              </span>
            </h2>
            {loadingAtivos ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface-container p-4 rounded-xl animate-pulse">
                    <div className="h-4 w-24 bg-surface-container-high rounded mb-2" />
                    <div className="h-5 w-32 bg-surface-container-high rounded mb-2" />
                    <div className="h-4 w-16 bg-surface-container-high rounded" />
                  </div>
                ))}
              </div>
            ) : pedidosAtivos.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant/40">
                <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                <p>Nenhum pedido ativo via WhatsApp</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pedidosAtivos.map(pedido => {
                  const statusInfo = STATUS_COLORS[pedido.status] || STATUS_COLORS.aberto
                  return (
                    <div
                      key={pedido.id}
                      className="bg-surface p-4 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">#{String(pedido.numero).padStart(4, '0')}</span>
                          <h3 className="font-headline font-bold text-on-surface truncate">{pedido.cliente_nome}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-400 font-headline font-bold">
                          R$ {Number(pedido.total).toFixed(2)}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {formatDateTimePtBR(pedido.updated_at)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">history</span>
                Histórico Recente
              </h2>
              <button
                onClick={() => refetchHistorico()}
                disabled={isRefetchingHistorico}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${isRefetchingHistorico ? 'animate-spin' : ''}`}>refresh</span>
                Atualizar
              </button>
            </div>
            {loadingHistorico ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface-container p-3 rounded-lg animate-pulse flex gap-4">
                    <div className="h-4 w-12 bg-surface-container-high rounded" />
                    <div className="h-4 w-24 bg-surface-container-high rounded" />
                    <div className="h-4 w-16 bg-surface-container-high rounded" />
                  </div>
                ))}
              </div>
            ) : historicoRecente?.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant/40">
                <span className="material-symbols-outlined text-4xl mb-2">history</span>
                <p>Nenhum histórico disponível</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historicoRecente?.map(pedido => {
                  const statusInfo = STATUS_COLORS[pedido.status] || STATUS_COLORS.entregue
                  return (
                    <div
                      key={pedido.id}
                      className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/5 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-on-surface-variant">#{String(pedido.numero).padStart(4, '0')}</span>
                        <span className="text-sm font-medium text-on-surface truncate max-w-[150px]">{pedido.cliente_nome}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-green-400 font-headline font-bold text-sm">
                          R$ {Number(pedido.total).toFixed(2)}
                        </span>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap">
                          {formatDatePtBR(pedido.updated_at)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'gestor' && (
        <div className="flex-1 overflow-y-auto space-y-8 pb-8">
          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Análise Inteligente
            </h2>
            {loadingAnalise ? (
              <div className="grid gap-4 md:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : analiseError ? (
              <div className="md:col-span-3 bg-error/10 border border-error/20 p-6 rounded-2xl flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-error text-4xl">error</span>
                <p className="text-error text-sm">Erro ao carregar análise</p>
                <button
                  onClick={() => refetchAnalise()}
                  className="px-4 py-2 bg-error text-on-error rounded-xl font-bold text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-green-500/5 border-l-4 border-[#22c55e] p-6 rounded-r-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">✅</span>
                    <h3 className="font-headline font-bold text-[#22c55e]">Pontos Positivos</h3>
                  </div>
                  <ul className="space-y-2">
                    {analiseData?.positivos?.map((item, i) => (
                      <li key={i} className="text-on-surface text-sm flex items-start gap-2">
                        <span className="text-[#22c55e] mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-yellow-500/5 border-l-4 border-[#eab308] p-6 rounded-r-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="font-headline font-bold text-[#eab308]">Pontos de Atenção</h3>
                  </div>
                  <ul className="space-y-2">
                    {analiseData?.atencao?.map((item, i) => (
                      <li key={i} className="text-on-surface text-sm flex items-start gap-2">
                        <span className="text-[#eab308] mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-500/5 border-l-4 border-[#f57c24] p-6 rounded-r-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🎯</span>
                    <h3 className="font-headline font-bold text-[#f57c24]">Sugestões de Ação</h3>
                  </div>
                  <div className="space-y-3">
                    {sugestoesLocais?.map((sugestao, i) => (
                      <div key={i} className="bg-surface-container/50 p-3 rounded-lg">
                        <h4 className="font-bold text-on-surface text-sm">{sugestao.titulo}</h4>
                        <p className="text-xs text-on-surface-variant mt-1">{sugestao.descricao}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleExecutarSugestao(i, sugestao.titulo, sugestao.action)}
                            className="flex-1 py-1.5 bg-[#e8391a] text-white rounded-lg text-xs font-bold hover:bg-[#e8391a]/80 transition-colors"
                          >
                            Executar
                          </button>
                          <button
                            onClick={() => handleIgnorarSugestao(i, sugestao.titulo)}
                            className="flex-1 py-1.5 border border-outline-variant text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container transition-colors"
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    ))}
                    {sugestoesLocais?.length === 0 && (
                      <p className="text-sm text-on-surface-variant/50 text-center py-4">Nenhuma sugestão no momento</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">chat</span>
              Chat Livre
            </h2>
            <div className="bg-surface-container/30 rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-5xl mb-2">chat</span>
                    <p>Inicie uma conversa com o assistente</p>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-[#e8391a] text-white rounded-br-sm'
                            : 'bg-[#252830] text-white rounded-bl-sm flex items-start gap-2'
                        }`}
                      >
                        {msg.role === 'agent' && (
                          <span className="material-symbols-outlined text-sm text-primary shrink-0 mt-0.5">smart_toy</span>
                        )}
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-outline-variant/10 bg-surface">
                <div className="flex gap-2">
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendChatMessage()
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    disabled={sendingMessage}
                    className="flex-1 bg-surface-container rounded-xl p-3 text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary resize-none h-12 min-h-[48px] max-h-[120px] disabled:opacity-50"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={sendingMessage || !chatInput.trim()}
                    className="px-4 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
                  >
                    {sendingMessage ? (
                      <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined">send</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">description</span>
              Relatórios Diários
            </h2>
            {loadingRelatorios ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface-container h-16 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !relatoriosDiarios || relatoriosDiarios.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant/40 bg-surface-container/20 rounded-2xl border border-outline-variant/5">
                <span className="material-symbols-outlined text-5xl mb-2">email</span>
                <p>Nenhum relatório enviado ainda.</p>
                <p className="text-sm mt-1">O primeiro será enviado hoje às 23h.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relatoriosDiarios.map(relatorio => (
                  <div
                    key={relatorio.id}
                    className="bg-surface p-4 rounded-xl border border-outline-variant/10 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-on-surface">
                        {formatDatePtBR(relatorio.data)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        relatorio.status === 'enviado'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {relatorio.status === 'enviado' ? 'Enviado' : 'Falhou'}
                      </span>
                    </div>
                    <button
                      onClick={() => reenviarRelatorio(relatorio.data)}
                      disabled={resendingRelatorios[relatorio.data]}
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {resendingRelatorios[relatorio.data] ? (
                        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      Reenviar
                    </button>
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
