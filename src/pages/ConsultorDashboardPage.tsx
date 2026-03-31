import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface Pedido {
  id: string
  numero: number
  cliente_nome: string
  status: string
  total: number
  canal: string
  created_at: string
  updated_at: string
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
  tenant_id: string
  data: string
  status: 'enviado' | 'falhou'
  enviado_em?: string
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preparando: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  pronto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  saiu_entrega: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  entregue: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const statusLabels: Record<string, string> = {
  aberto: 'Novo',
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  pronto: 'Pronto',
  saiu_entrega: 'Saiu p/ Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-container-high rounded-2xl p-4 ${className}`}>
      <div className="h-4 bg-surface-container rounded w-3/4 mb-2" />
      <div className="h-3 bg-surface-container rounded w-1/2" />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {statusLabels[status] || status}
    </span>
  )
}

export default function ConsultorDashboardPage() {
  const [activeTab, setActiveTab] = useState<'vendas' | 'gestor'>('vendas')
  const queryClient = useQueryClient()
  
  const [pedidosAtivos, setPedidosAtivos] = useState<Pedido[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sugestoesLocal, setSugestoesLocal] = useState<AnaliseData['sugestoes']>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchPedidosAtivos = useCallback(async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, status, total, canal, created_at, updated_at')
      .eq('canal', 'whatsapp')
      .not('status', 'in', `('entregue','cancelado','novo')`)
      .order('updated_at', { ascending: false })
      .limit(50)
    
    if (data) setPedidosAtivos(data)
  }, [])

  useEffect(() => {
    fetchPedidosAtivos()
  }, [fetchPedidosAtivos])

  useRealtime('pedidos', () => {
    fetchPedidosAtivos()
  })

  const { data: pedidosHistoricos, isLoading: loadingHistoricos, refetch: refetchHistoricos } = useQuery({
    queryKey: ['pedidos-historicos-whatsapp'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('id, numero, cliente_nome, status, total, canal, created_at, updated_at')
        .eq('canal', 'whatsapp')
        .in('status', ['entregue', 'cancelado'])
        .order('updated_at', { ascending: false })
        .limit(10)
      return data || []
    },
  })

  const { data: analiseData, isLoading: loadingAnalise, error: erroAnalise, refetch: refetchAnalise } = useQuery({
    queryKey: ['consultor-analise'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { modo: 'analise' }
      })
      if (error) throw error
      return data as AnaliseData
    },
  })

  useEffect(() => {
    if (analiseData?.sugestoes) {
      setSugestoesLocal(analiseData.sugestoes)
    }
  }, [analiseData])

  const { data: relatorios, isLoading: loadingRelatorios } = useQuery({
    queryKey: ['relatorios-diarios'],
    queryFn: async () => {
      const { data } = await supabase
        .from('relatorios_diarios')
        .select('*')
        .order('data', { ascending: false })
        .limit(5)
      return data as RelatorioDiario[] | null
    },
  })

  const chatMutation = useMutation({
    mutationFn: async (mensagem: string) => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { mensagem, modo: 'chat' }
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data?.resposta) {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'agent',
          content: data.resposta,
          timestamp: new Date()
        }])
      }
    }
  })

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, userMessage])
    chatMutation.mutate(chatInput)
    setChatInput('')
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleExecutarSugestao = async (index: number, sugestao: AnaliseData['sugestoes'][0]) => {
    await supabase.from('historico_agente').insert({
      tipo: 'executado',
      descricao: sugestao.titulo,
      executado_em: new Date().toISOString()
    })
    
    setSugestoesLocal(prev => prev.filter((_, i) => i !== index))
    queryClient.invalidateQueries({ queryKey: ['consultor-analise'] })
    
    alert('Ação executada com sucesso!')
  }

  const handleIgnorarSugestao = async (index: number, sugestao: AnaliseData['sugestoes'][0]) => {
    await supabase.from('historico_agente').insert({
      tipo: 'ignorado',
      descricao: sugestao.titulo
    })
    
    setSugestoesLocal(prev => prev.filter((_, i) => i !== index))
  }

  const reenviarRelatorio = async (dataRelatorio: string) => {
    await supabase.functions.invoke('relatorio-diario', {
      body: { data: dataRelatorio }
    })
    queryClient.invalidateQueries({ queryKey: ['relatorios-diarios'] })
  }

  const columns = [
    { id: 'preparando', title: 'Em Preparo', color: 'border-orange-500' },
    { id: 'pronto', title: 'Pronto', color: 'border-purple-500' },
    { id: 'saiu_entrega', title: 'Saiu p/ Entrega', color: 'border-purple-500' },
  ]

  return (
    <div className="animate-fade-in space-y-6 px-2 lg:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">Painel do Consultor</h1>
          <p className="text-on-surface-variant/60 font-body mt-1">Gestão inteligente do seu delivery</p>
        </div>
        
        <div className="flex bg-surface-container-high rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('vendas')}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'vendas' 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Vendas
          </button>
          <button
            onClick={() => setActiveTab('gestor')}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'gestor' 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Gestor Consultor
          </button>
        </div>
      </header>

      {activeTab === 'vendas' && (
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">view_kanban</span>
              Pedidos Ativos (WhatsApp)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map(col => {
                const pedidosColuna = pedidosAtivos.filter(p => p.status === col.id)
                return (
                  <div key={col.id} className={`bg-surface-container rounded-2xl border-l-4 ${col.color} p-4`}>
                    <h3 className="font-bold text-sm text-on-surface mb-3">{col.title}</h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {pedidosColuna.length === 0 ? (
                        <p className="text-on-surface-variant/50 text-sm text-center py-4">Nenhum pedido</p>
                      ) : (
                        pedidosColuna.map(pedido => (
                          <div key={pedido.id} className="bg-surface-container-high p-3 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-on-surface">#{pedido.numero}</span>
                              <span className="text-green-400 font-bold">
                                R$ {pedido.total.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm text-on-surface-variant mb-2">{pedido.cliente_nome}</p>
                            <div className="flex justify-between items-center">
                              <StatusBadge status={pedido.status} />
                              <span className="text-xs text-on-surface-variant/60">
                                {format(new Date(pedido.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="bg-surface-container rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">history</span>
                Histórico Recente
              </h2>
              <button
                onClick={() => refetchHistoricos()}
                className="px-4 py-2 bg-surface-container-high rounded-xl text-sm font-medium hover:bg-surface-container-highest transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Atualizar
              </button>
            </div>
            
            {loadingHistoricos ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <SkeletonCard key={i} className="h-16" />)}
              </div>
            ) : pedidosHistoricos && pedidosHistoricos.length > 0 ? (
              <div className="space-y-2">
                {pedidosHistoricos.map(pedido => (
                  <div key={pedido.id} className="bg-surface-container-high p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-on-surface">#{pedido.numero}</span>
                      <span className="text-sm text-on-surface-variant">{pedido.cliente_nome}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={pedido.status} />
                      <span className="text-green-400 font-bold">R$ {pedido.total.toFixed(2)}</span>
                      <span className="text-xs text-on-surface-variant/60">
                        {format(new Date(pedido.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-on-surface-variant/50">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p>Nenhum histórico encontrado</p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'gestor' && (
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500">analytics</span>
              Análise Inteligente
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loadingAnalise ? (
                <>
                  <SkeletonCard className="h-48" />
                  <SkeletonCard className="h-48" />
                  <SkeletonCard className="h-48" />
                </>
              ) : erroAnalise ? (
                <div className="col-span-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                  <p className="text-red-400 mb-4">Erro ao carregar análise</p>
                  <button
                    onClick={() => refetchAnalise()}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-green-500/5 border-l-4 border-green-500 rounded-2xl p-4">
                    <h3 className="font-bold text-green-400 flex items-center gap-2 mb-3">
                      <span>✅</span> Pontos Positivos
                    </h3>
                    <ul className="space-y-2">
                      {analiseData?.positivos?.map((item, i) => (
                        <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                          <span className="text-green-400">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-500/5 border-l-4 border-yellow-500 rounded-2xl p-4">
                    <h3 className="font-bold text-yellow-400 flex items-center gap-2 mb-3">
                      <span>⚠️</span> Pontos de Atenção
                    </h3>
                    <ul className="space-y-2">
                      {analiseData?.atencao?.map((item, i) => (
                        <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                          <span className="text-yellow-400">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-orange-500/5 border-l-4 border-orange-500 rounded-2xl p-4">
                    <h3 className="font-bold text-orange-400 flex items-center gap-2 mb-3">
                      <span>🎯</span> Sugestões de Ação
                    </h3>
                    <div className="space-y-3 max-h-36 overflow-y-auto">
                      {sugestoesLocal?.map((item, i) => (
                        <div key={i} className="bg-surface-container-high p-2 rounded-xl">
                          <p className="text-sm font-medium text-on-surface">{item.titulo}</p>
                          <p className="text-xs text-on-surface-variant mb-2">{item.descricao}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExecutarSugestao(i, item)}
                              className="px-2 py-1 bg-[#e8391a] text-white text-xs rounded-lg hover:bg-[#d32f2f] transition-colors"
                            >
                              Executar
                            </button>
                            <button
                              onClick={() => handleIgnorarSugestao(i, item)}
                              className="px-2 py-1 border border-outline-variant text-on-surface-variant text-xs rounded-lg hover:bg-surface-container-high transition-colors"
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
          </section>

          <section className="bg-surface-container rounded-2xl p-6">
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e8391a]">chat</span>
              Chat Livre
            </h2>
            
            <div className="bg-[#252830] rounded-2xl p-4 max-h-[400px] overflow-y-auto space-y-4 mb-4">
              {chatMessages.length === 0 ? (
                <p className="text-on-surface-variant/50 text-center py-8">
                  Tire dúvidas sobre seu negócio com o assistente IA
                </p>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-[#e8391a] text-white'
                          : 'bg-[#252830] text-on-surface'
                      }`}
                    >
                      {msg.role === 'agent' && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-sm bg-surface-container p-1 rounded-full">smart_toy</span>
                          <span className="text-xs text-on-surface-variant">Assistente</span>
                        </div>
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
                    handleSendChat()
                  }
                }}
                placeholder="Digite sua mensagem..."
                disabled={chatMutation.isPending}
                className="flex-1 bg-surface-container-high border border-outline-variant rounded-xl p-3 text-on-surface resize-none h-12 focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleSendChat}
                disabled={chatMutation.isPending || !chatInput.trim()}
                className="px-6 bg-[#e8391a] text-white rounded-xl hover:bg-[#d32f2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {chatMutation.isPending ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <>
                    <span>Enviar</span>
                    <span className="material-symbols-outlined ml-1">send</span>
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="bg-surface-container rounded-2xl p-6">
            <h2 className="text-xl font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">description</span>
              Relatórios Diários
            </h2>
            
            {loadingRelatorios ? (
              <div className="space-y-3">
                {[1,2].map(i => <SkeletonCard key={i} className="h-16" />)}
              </div>
            ) : relatorios && relatorios.length > 0 ? (
              <div className="space-y-3">
                {relatorios.map(rel => (
                  <div key={rel.id} className="bg-surface-container-high p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-on-surface font-medium">
                        {format(new Date(rel.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        rel.status === 'enviado' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {rel.status === 'enviado' ? 'Enviado' : 'Falhou'}
                      </span>
                    </div>
                    {rel.status === 'falhou' && (
                      <button
                        onClick={() => reenviarRelatorio(rel.data)}
                        className="px-4 py-2 bg-surface-container rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors"
                      >
                        Reenviar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-on-surface-variant/50">
                <span className="material-symbols-outlined text-4xl mb-2">description</span>
                <p>Nenhum relatório enviado ainda. O primeiro será enviado hoje às 23h.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
