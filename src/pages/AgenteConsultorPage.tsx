import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
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
  updated_at: string
}

interface AnaliseData {
  positivos: string[]
  atencao: string[]
  sugestoes: Array<{ titulo: string; descricao: string; action: string }>
}

interface Mensagem {
  id: string
  texto: string
  from: 'user' | 'agent'
  timestamp: Date
}

interface RelatorioDiario {
  id: string
  data: string
  status: 'enviado' | 'falhou'
}

const mapKanbanStatus = (rawStatus: string) => {
  if (['aberto', 'pendente', 'confirmado'].includes(rawStatus)) return 'novo'
  if (rawStatus === 'preparando') return 'em_preparo'
  if (['pronto', 'saiu_entrega'].includes(rawStatus)) return 'saiu_entrega'
  if (rawStatus === 'entregue') return 'entregue'
  return 'cancelado'
}

const getStatusColor = (status: string) => {
  const s = mapKanbanStatus(status)
  switch (s) {
    case 'novo': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'em_preparo': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'saiu_entrega': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'entregue': return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'cancelado': return 'bg-red-500/20 text-red-400 border-red-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDateTime = (dateStr: string) => 
  format(parseISO(dateStr), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })

const formatDate = (dateStr: string) => 
  format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

function SkeletonCard() {
  return (
    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 animate-pulse">
      <div className="h-4 bg-surface-container-high rounded w-3/4 mb-3" />
      <div className="h-3 bg-surface-container-high rounded w-1/2 mb-2" />
      <div className="h-3 bg-surface-container-high rounded w-2/3" />
    </div>
  )
}

function SkeletonLine() {
  return <div className="h-3 bg-surface-container-high rounded w-full mb-2 animate-pulse" />
}

export default function AgenteConsultorPage() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'gestor'>('whatsapp')
  const [tenantId, setTenantId] = useState<string>('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const fetchTenant = async () => {
      const { data } = await supabase.from('configuracoes').select('id').limit(1).maybeSingle()
      if (data?.id) setTenantId(data.id)
    }
    fetchTenant()
  }, [])

  const fetchPedidosWhatsapp = useCallback(async () => {
    if (!tenantId) return []
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('canal', 'whatsapp')
      .not('status', 'in', '("entregue","cancelado","novo")')
      .order('updated_at', { ascending: false })
      .limit(20)
    return (data || []).map((p: any) => ({
      id: p.id,
      numero: p.numero,
      cliente_nome: p.cliente_nome,
      total: Number(p.total),
      status: p.status,
      canal: p.canal,
      updated_at: p.updated_at
    }))
  }, [tenantId])

  const fetchHistoricoRecente = useCallback(async () => {
    if (!tenantId) return []
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('canal', 'whatsapp')
      .in('status', ['entregue', 'cancelado'])
      .order('updated_at', { ascending: false })
      .limit(10)
    return (data || []).map((p: any) => ({
      id: p.id,
      numero: p.numero,
      cliente_nome: p.cliente_nome,
      total: Number(p.total),
      status: p.status,
      canal: p.canal,
      updated_at: p.updated_at
    }))
  }, [tenantId])

  const { data: pedidosWhatsapp = [], isLoading: loadingWhatsapp } = useQuery({
    queryKey: ['pedidos-whatsapp', tenantId],
    queryFn: fetchPedidosWhatsapp,
    enabled: !!tenantId && activeTab === 'whatsapp'
  })

  const { data: historicoRecente = [], isLoading: loadingHistorico, refetch: refetchHistorico } = useQuery({
    queryKey: ['historico-whatsapp', tenantId],
    queryFn: fetchHistoricoRecente,
    enabled: !!tenantId && activeTab === 'whatsapp'
  })

  useEffect(() => {
    if (activeTab === 'whatsapp' && tenantId) {
      queryClient.invalidateQueries({ queryKey: ['pedidos-whatsapp'] })
    }
  }, [activeTab, tenantId, queryClient])

  useRealtime('pedidos', () => {
    if (activeTab === 'whatsapp') {
      queryClient.invalidateQueries({ queryKey: ['pedidos-whatsapp'] })
    }
  })

  const { data: analiseData, isLoading: loadingAnalise, refetch: refetchAnalise, error: analiseError } = useQuery({
    queryKey: ['analise-consultor', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, modo: 'analise' }
      })
      if (error) throw error
      return data as AnaliseData
    },
    enabled: !!tenantId && activeTab === 'gestor'
  })

  const { data: relatoriosDiarios = [], isLoading: loadingRelatorios, refetch: refetchRelatorios } = useQuery({
    queryKey: ['relatorios-diarios', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relatorios_diarios')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('data', { ascending: false })
        .limit(5)
      if (error) return [] as RelatorioDiario[]
      return (data || []).map((r: any) => ({
        id: r.id,
        data: r.data,
        status: r.status as 'enviado' | 'falhou'
      }))
    },
    enabled: !!tenantId && activeTab === 'gestor'
  })

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [inputMensagem, setInputMensagem] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const sendMessageMutation = useMutation({
    mutationFn: async (mensagem: string) => {
      setSendingMessage(true)
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, mensagem, modo: 'chat' }
      })
      if (error) throw error
      return data
    },
    onSuccess: (data: any) => {
      setMensagens(prev => [...prev, {
        id: Date.now().toString(),
        texto: data?.resposta || 'Mensagem recebida',
        from: 'agent',
        timestamp: new Date()
      }])
      setInputMensagem('')
      setSendingMessage(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    },
    onError: () => {
      setSendingMessage(false)
    }
  })

  const handleSendMessage = () => {
    if (!inputMensagem.trim()) return
    setMensagens(prev => [...prev, {
      id: Date.now().toString(),
      texto: inputMensagem,
      from: 'user',
      timestamp: new Date()
    }])
    sendMessageMutation.mutate(inputMensagem)
  }

  const [sugestoesLocal, setSugestoesLocal] = useState<AnaliseData['sugestoes']>([])

  useEffect(() => {
    if (analiseData?.sugestoes) {
      setSugestoesLocal(analiseData.sugestoes)
    }
  }, [analiseData])

  const executarSugestao = async (sugestao: { titulo: string; action: string }, index: number) => {
    try {
      if (sugestao.action) {
        await supabase.functions.invoke(sugestao.action, { body: { tenant_id: tenantId } })
      }
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'executado',
        descricao: sugestao.titulo,
        executado_em: new Date().toISOString()
      })
      setSugestoesLocal(prev => prev.filter((_, i) => i !== index))
      alert('Ação executada com sucesso!')
    } catch (err) {
      console.error('Erro ao executar:', err)
      alert('Erro ao executar ação')
    }
  }

  const ignorarSugestao = async (sugestao: { titulo: string }, index: number) => {
    try {
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'ignorado',
        descricao: sugestao.titulo
      })
      setSugestoesLocal(prev => prev.filter((_, i) => i !== index))
    } catch (err) {
      console.error('Erro ao ignorar:', err)
    }
  }

  const reenviarRelatorioMutation = useMutation({
    mutationFn: async (data: string) => {
      return supabase.functions.invoke('relatorio-diario', {
        body: { tenant_id: tenantId, data }
      })
    }
  })

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="animate-pulse text-on-surface-variant">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col animate-fade-in">
      <header className="px-8 pt-8 pb-4 shrink-0">
        <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tighter">Agente Consultor</h1>
        <p className="text-on-surface-variant font-body mt-1">Gestão inteligente via WhatsApp e análise de desempenho.</p>
      </header>

      <div className="px-8 mb-4 shrink-0">
        <div className="flex gap-1 p-1 bg-surface-container rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'whatsapp' 
                ? 'bg-primary text-on-primary shadow-lg' 
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('gestor')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'gestor' 
                ? 'bg-primary text-on-primary shadow-lg' 
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Gestor Consultor
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-8 pb-8">
        {activeTab === 'whatsapp' ? (
          <div className="h-full flex flex-col lg:grid lg:grid-cols-2 gap-6 overflow-hidden">
            <div className="flex flex-col overflow-hidden">
              <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">chat</span>
                Pedidos Ativos (WhatsApp)
              </h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {loadingWhatsapp ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <SkeletonCard key={i} />)}
                  </div>
                ) : pedidosWhatsapp.length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                    <p>Nenhum pedido ativo via WhatsApp</p>
                  </div>
                ) : (
                  pedidosWhatsapp.map((pedido: Pedido) => (
                    <div key={pedido.id} className="bg-surface p-4 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs font-bold text-on-surface-variant">#{String(pedido.numero).padStart(4, '0')}</span>
                          <h3 className="font-bold text-on-surface">{pedido.cliente_nome}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${getStatusColor(pedido.status)}`}>
                          {pedido.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-400 font-bold">{formatCurrency(pedido.total)}</span>
                        <span className="text-xs text-on-surface-variant">{formatDateTime(pedido.updated_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">history</span>
                  Histórico Recente
                </h2>
                <button
                  onClick={() => refetchHistorico()}
                  className="px-3 py-1.5 text-xs font-bold bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Atualizar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {loadingHistorico ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <SkeletonLine key={i} />)}
                  </div>
                ) : historicoRecente.length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-5xl mb-2">history</span>
                    <p>Nenhum histórico recente</p>
                  </div>
                ) : (
                  historicoRecente.map((pedido: Pedido) => (
                    <div key={pedido.id} className="bg-surface-container/30 p-3 rounded-lg border border-outline-variant/5 flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-on-surface-variant">#{String(pedido.numero).padStart(4, '0')}</span>
                        <span className="mx-2 text-on-surface-variant/30">•</span>
                        <span className="text-sm text-on-surface truncate">{pedido.cliente_nome}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(pedido.status)}`}>
                        {pedido.status}
                      </span>
                      <span className="text-green-400 font-bold ml-3">{formatCurrency(pedido.total)}</span>
                      <span className="text-xs text-on-surface-variant ml-3 whitespace-nowrap">{formatDate(pedido.updated_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loadingAnalise ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : analiseError ? (
                <div className="col-span-3 bg-error/10 border border-error/20 p-6 rounded-xl text-center">
                  <p className="text-error mb-3">Erro ao carregar análise</p>
                  <button 
                    onClick={() => refetchAnalise()}
                    className="px-4 py-2 bg-error text-on-error rounded-lg font-bold text-sm"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-green-500/5 p-5 rounded-xl border-l-4 border-green-500">
                    <h3 className="font-headline font-bold text-green-400 flex items-center gap-2 mb-3">
                      <span>✅</span> Pontos Positivos
                    </h3>
                    <ul className="space-y-2">
                      {(analiseData?.positivos || []).map((item, i) => (
                        <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {item}
                        </li>
                      ))}
                      {(analiseData?.positivos || []).length === 0 && (
                        <li className="text-sm text-on-surface-variant/50">Nenhum ponto positivo encontrado</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-yellow-500/5 p-5 rounded-xl border-l-4 border-yellow-500">
                    <h3 className="font-headline font-bold text-yellow-400 flex items-center gap-2 mb-3">
                      <span>⚠️</span> Pontos de Atenção
                    </h3>
                    <ul className="space-y-2">
                      {(analiseData?.atencao || []).map((item, i) => (
                        <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          {item}
                        </li>
                      ))}
                      {(analiseData?.atencao || []).length === 0 && (
                        <li className="text-sm text-on-surface-variant/50">Nenhum ponto de atenção</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-orange-500/5 p-5 rounded-xl border-l-4 border-orange-500">
                    <h3 className="font-headline font-bold text-orange-400 flex items-center gap-2 mb-3">
                      <span>🎯</span> Sugestões de Ação
                    </h3>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {sugestoesLocal.map((sugestao, i) => (
                        <div key={i} className="bg-surface-container/50 p-3 rounded-lg">
                          <h4 className="font-bold text-sm text-on-surface">{sugestao.titulo}</h4>
                          <p className="text-xs text-on-surface-variant mt-1">{sugestao.descricao}</p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => executarSugestao(sugestao, i)}
                              className="flex-1 px-2 py-1.5 bg-[#e8391a] text-white text-xs font-bold rounded-lg hover:bg-[#e8391a]/80 transition-colors"
                            >
                              Executar
                            </button>
                            <button
                              onClick={() => ignorarSugestao(sugestao, i)}
                              className="px-2 py-1.5 border border-outline-variant text-on-surface-variant text-xs font-bold rounded-lg hover:bg-surface-container transition-colors"
                            >
                              Ignorar
                            </button>
                          </div>
                        </div>
                      ))}
                      {sugestoesLocal.length === 0 && (
                        <p className="text-sm text-on-surface-variant/50">Nenhuma sugestão pendente</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-[#252830] rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10">
                <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">chat</span>
                  Chat Livre
                </h3>
              </div>
              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                {mensagens.length === 0 ? (
                  <div className="text-center text-on-surface-variant/40 py-10">
                    <span className="material-symbols-outlined text-5xl mb-2">smart_toy</span>
                    <p className="text-sm">Como posso ajudar hoje?</p>
                  </div>
                ) : (
                  mensagens.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${
                        msg.from === 'user' 
                          ? 'bg-[#e8391a] text-white' 
                          : 'bg-[#252830] text-on-surface border border-outline-variant/10'
                      }`}>
                        {msg.from === 'agent' && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            <span className="text-xs font-bold opacity-70">Agente</span>
                          </div>
                        )}
                        <p className="text-sm">{msg.texto}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-outline-variant/10 flex gap-2">
                <textarea
                  value={inputMensagem}
                  onChange={(e) => setInputMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  placeholder="Digite sua mensagem..."
                  disabled={sendingMessage}
                  className="flex-1 bg-surface-container rounded-xl p-3 text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary resize-none disabled:opacity-50"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !inputMensagem.trim()}
                  className="px-4 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                >
                  {sendingMessage ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enviar</span>
                      <span className="material-symbols-outlined ml-1">send</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">description</span>
                Relatórios Diários
              </h3>
              <div className="space-y-3">
                {loadingRelatorios ? (
                  <SkeletonCard />
                ) : relatoriosDiarios.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant/40 bg-surface-container/30 rounded-xl">
                    <span className="material-symbols-outlined text-4xl mb-2">email</span>
                    <p className="text-sm">Nenhum relatório enviado ainda.</p>
                    <p className="text-xs mt-1">O primeiro será enviado hoje às 23h.</p>
                  </div>
                ) : (
                  relatoriosDiarios.map((rel) => (
                    <div key={rel.id} className="bg-surface p-4 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-on-surface">{formatDate(rel.data)}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          rel.status === 'enviado' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {rel.status === 'enviado' ? 'Enviado' : 'Falhou'}
                        </span>
                      </div>
                      <button
                        onClick={() => reenviarRelatorioMutation.mutate(rel.data)}
                        disabled={reenviarRelatorioMutation.isPending}
                        className="px-3 py-1.5 text-xs font-bold border border-outline-variant hover:bg-surface-container rounded-lg transition-colors disabled:opacity-50"
                      >
                        {reenviarRelatorioMutation.isPending ? 'Enviando...' : 'Reenviar'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
