import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

type Pedido = {
  id: string
  numero: number
  cliente_nome: string
  total: number
  status: string
  canal: string
  updated_at: string
  created_at: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  novo: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Novo' },
  aberto: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Aberto' },
  pendente: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pendente' },
  confirmado: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Confirmado' },
  preparando: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Preparando' },
  pronto: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Pronto' },
  saiu_entrega: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Saiu p/ Entrega' },
  entregue: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Entregue' },
  cancelado: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelado' },
}

const formatDatePtBR = (dateStr: string) => {
  return format(parseISO(dateStr), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
}

const formatDateShort = (dateStr: string) => {
  return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

export default function OperacoesPage() {
  const [activeTab, setActiveTab] = useState<'operador' | 'gestor'>('operador')
  
  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col p-4 md:p-6 animate-fade-in bg-background">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tighter">Operações</h1>
          <p className="text-on-surface-variant font-body mt-1">Gerenciamento de pedidos e análise gerencial</p>
        </div>
        
        <div className="flex bg-surface-container rounded-xl p-1">
          <button
            onClick={() => setActiveTab('operador')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'operador' 
                ? 'bg-primary text-on-primary shadow-md' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Operador
          </button>
          <button
            onClick={() => setActiveTab('gestor')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'gestor' 
                ? 'bg-primary text-on-primary shadow-md' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Gestor Consultor
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'operador' ? <TabOperador /> : <TabGestorConsultor />}
      </div>
    </div>
  )
}

function TabOperador() {
  const [pedidosAtivos, setPedidosAtivos] = useState<Pedido[]>([])
  const [loadingAtivos, setLoadingAtivos] = useState(true)
  const queryClient = useQueryClient()

  const fetchAtivos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, cliente_nome, total, status, canal, updated_at, created_at')
        .eq('canal', 'whatsapp')
        .not('status', 'in', `('entregue','cancelado','novo')`)
        .order('updated_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setPedidosAtivos(data || [])
    } catch (err) {
      console.error('Erro buscar pedidos ativos:', err)
      setPedidosAtivos([])
    } finally {
      setLoadingAtivos(false)
    }
  }, [])

  useEffect(() => {
    fetchAtivos()
  }, [fetchAtivos])

  useRealtime('pedidos', () => {
    fetchAtivos()
  })

  const { data: historicoData, isLoading: loadingHistorico, refetch: refetchHistorico } = useQuery({
    queryKey: ['pedidos-historico-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, cliente_nome, total, status, canal, updated_at, created_at')
        .eq('canal', 'whatsapp')
        .in('status', ['entregue', 'cancelado'])
        .order('updated_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data || []
    },
  })

  return (
    <div className="h-full overflow-y-auto space-y-8 pb-4">
      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-400">chat</span>
          Pedidos Ativos (WhatsApp)
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">Realtime</span>
        </h2>
        
        {loadingAtivos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface p-4 rounded-xl border border-outline-variant/10 animate-pulse">
                <div className="h-4 bg-surface-container rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-surface-container rounded w-1/3 mb-2"></div>
                <div className="h-5 bg-surface-container rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : pedidosAtivos.length === 0 ? (
          <div className="text-center py-12 opacity-40">
            <span className="material-symbols-outlined text-5xl">inbox</span>
            <p className="text-on-surface-variant mt-2 font-bold">Nenhum pedido ativo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidosAtivos.map(pedido => {
              const statusStyle = STATUS_COLORS[pedido.status] || STATUS_COLORS.novo
              return (
                <div key={pedido.id} className="bg-surface p-4 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-on-surface-variant">#{String(pedido.numero).padStart(4, '0')}</span>
                      <h3 className="font-headline font-bold text-on-surface truncate">{pedido.cliente_nome}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-3">
                    <span className="text-xs text-on-surface-variant">{formatDatePtBR(pedido.updated_at)}</span>
                    <span className="text-green-400 font-headline font-bold">R$ {Number(pedido.total).toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">history</span>
          Histórico Recente
        </h2>
        
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => refetchHistorico()}
            className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Atualizar
          </button>
        </div>

        {loadingHistorico ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface p-3 rounded-xl border border-outline-variant/10 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 bg-surface-container rounded w-1/4"></div>
                  <div className="h-4 bg-surface-container rounded w-1/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !historicoData || historicoData.length === 0 ? (
          <div className="text-center py-8 opacity-40">
            <span className="material-symbols-outlined text-4xl">history</span>
            <p className="text-on-surface-variant mt-2 font-bold">Nenhum histórico recente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {historicoData.map(pedido => {
              const statusStyle = STATUS_COLORS[pedido.status] || STATUS_COLORS.novo
              return (
                <div key={pedido.id} className="bg-surface p-3 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-on-surface-variant shrink-0">#{String(pedido.numero).padStart(4, '0')}</span>
                    <span className="text-sm text-on-surface truncate">{pedido.cliente_nome}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-green-400 font-bold text-sm">R$ {Number(pedido.total).toFixed(2)}</span>
                    <span className="text-xs text-on-surface-variant">{formatDateShort(pedido.updated_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

type Suggestion = {
  titulo: string
  descricao: string
  action: string
}

type AnaliseData = {
  positivos: string[]
  atencao: string[]
  sugestoes: Suggestion[]
}

function TabGestorConsultor() {
  const queryClient = useQueryClient()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sugestoesLocal, setSugestoesLocal] = useState<Suggestion[]>([])
  
  const { data: analiseData, isLoading: loadingAnalise, error: analiseError, refetch: refetchAnalise } = useQuery({
    queryKey: ['consultant-analise'],
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

  const { data: relatoriosData, isLoading: loadingRelatorios, refetch: refetchRelatorios } = useQuery({
    queryKey: ['relatorios-diarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relatorios_diarios')
        .select('*')
        .order('data', { ascending: false })
        .limit(5)
      
      if (error) {
        console.warn('Tabela relatorios_diarios não existe ou erro:', error)
        return []
      }
      return data || []
    },
    retry: 1
  })

  const chatMutation = useMutation({
    mutationFn: async (mensagem: string) => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { mensagem, modo: 'chat' }
      })
      if (error) throw error
      return data as { resposta: string }
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: 'agent', content: data.resposta }])
    }
  })

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatInput('')
    chatMutation.mutate(userMsg)
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleExecutarSugestao = async (sugestao: Suggestion) => {
    try {
      await supabase.from('historico_agente').insert({
        tipo: 'executado',
        descricao: sugestao.titulo,
        executado_em: new Date().toISOString()
      })
      setSugestoesLocal(prev => prev.filter(s => s.titulo !== sugestao.titulo))
      alert('Ação executada com sucesso!')
    } catch (err) {
      console.error('Erro ao executar ação:', err)
    }
  }

  const handleIgnorarSugestao = async (sugestao: Suggestion) => {
    try {
      await supabase.from('historico_agente').insert({
        tipo: 'ignorado',
        descricao: sugestao.titulo
      })
      setSugestoesLocal(prev => prev.filter(s => s.titulo !== sugestao.titulo))
    } catch (err) {
      console.error('Erro ao ignorar:', err)
    }
  }

  const handleReenviarRelatorio = async (dataRelatorio: string) => {
    try {
      await supabase.functions.invoke('relatorio-diario', {
        body: { data: dataRelatorio }
      })
      refetchRelatorios()
    } catch (err) {
      console.error('Erro ao reenviar relatório:', err)
    }
  }

  return (
    <div className="h-full overflow-y-auto space-y-8 pb-4">
      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">analytics</span>
          Análise Gerencial
        </h2>

        {loadingAnalise ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface p-5 rounded-xl border border-outline-variant/10 animate-pulse">
                <div className="h-5 bg-surface-container rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-surface-container rounded"></div>
                  <div className="h-3 bg-surface-container rounded w-4/5"></div>
                  <div className="h-3 bg-surface-container rounded w-3/5"></div>
                </div>
              </div>
            ))}
          </div>
        ) : analiseError ? (
          <div className="bg-error/10 border border-error/20 p-4 rounded-xl flex items-center justify-between">
            <span className="text-error font-bold">Erro ao carregar análise</span>
            <button onClick={() => refetchAnalise()} className="px-3 py-1.5 bg-error text-on-error rounded-lg text-xs font-bold">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-500/5 border-l-4 border-green-500 p-5 rounded-xl">
              <h3 className="font-headline font-bold text-green-400 flex items-center gap-2 mb-3">
                <span>✅</span> Pontos Positivos
              </h3>
              <ul className="space-y-2">
                {(analiseData?.positivos || []).map((item, i) => (
                  <li key={i} className="text-sm text-on-surface flex items-start gap-2">
                    <span className="text-green-400">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-500/5 border-l-4 border-yellow-500 p-5 rounded-xl">
              <h3 className="font-headline font-bold text-yellow-400 flex items-center gap-2 mb-3">
                <span>⚠️</span> Pontos de Atenção
              </h3>
              <ul className="space-y-2">
                {(analiseData?.atencao || []).map((item, i) => (
                  <li key={i} className="text-sm text-on-surface flex items-start gap-2">
                    <span className="text-yellow-400">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-500/5 border-l-4 border-orange-500 p-5 rounded-xl">
              <h3 className="font-headline font-bold text-orange-400 flex items-center gap-2 mb-3">
                <span>🎯</span> Sugestões de Ação
              </h3>
              <div className="space-y-3">
                {sugestoesLocal.map((sugestao, i) => (
                  <div key={i} className="bg-surface p-3 rounded-lg border border-outline-variant/10">
                    <p className="font-bold text-on-surface text-sm">{sugestao.titulo}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{sugestao.descricao}</p>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => handleExecutarSugestao(sugestao)}
                        className="px-2 py-1 bg-[#e8391a] text-white rounded text-xs font-bold hover:bg-[#e8391a]/80"
                      >
                        Executar
                      </button>
                      <button 
                        onClick={() => handleIgnorarSugestao(sugestao)}
                        className="px-2 py-1 border border-outline-variant text-on-surface-variant rounded text-xs font-bold hover:bg-surface-container"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                ))}
                {sugestoesLocal.length === 0 && (
                  <p className="text-sm text-on-surface-variant italic">Nenhuma sugestão</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#e8391a]">chat</span>
          Chat Livre
        </h2>

        <div className="bg-[#252830] rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <p className="text-center text-on-surface-variant text-sm py-8">
                Envie uma mensagem para começar a conversar com o assistente
              </p>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-[#e8391a] text-white' 
                      : 'bg-[#252830] text-on-surface border border-outline-variant/10'
                  }`}>
                    {msg.role === 'agent' && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-sm">smart_toy</span>
                        <span className="text-xs font-bold text-on-surface-variant">Agente</span>
                      </div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 bg-surface-container flex gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendChat())}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-surface border border-outline-variant/10 rounded-lg p-2 text-sm text-on-surface resize-none outline-none focus:border-primary"
              rows={1}
              disabled={chatMutation.isPending}
            />
            <button
              onClick={handleSendChat}
              disabled={chatMutation.isPending || !chatInput.trim()}
              className="px-4 bg-[#e8391a] text-white rounded-lg font-bold text-sm hover:bg-[#e8391a]/80 disabled:opacity-50 flex items-center justify-center min-w-[80px]"
            >
              {chatMutation.isPending ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Enviar'
              )}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">description</span>
          Relatórios Diários
        </h2>

        {loadingRelatorios ? (
          <div className="space-y-2">
            {[1,2].map(i => (
              <div key={i} className="bg-surface p-3 rounded-xl border border-outline-variant/10 animate-pulse">
                <div className="h-4 bg-surface-container rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : !relatoriosData || relatoriosData.length === 0 ? (
          <div className="text-center py-8 bg-surface-container/30 rounded-xl border border-outline-variant/10">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">description</span>
            <p className="text-on-surface-variant mt-2 font-bold">Nenhum relatório enviado ainda</p>
            <p className="text-xs text-on-surface-variant/60">O primeiro será enviado hoje às 23h</p>
          </div>
        ) : (
          <div className="space-y-2">
            {relatoriosData.map((relatorio: any) => (
              <div key={relatorio.id} className="bg-surface p-3 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-on-surface">
                    {format(parseISO(relatorio.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    relatorio.status === 'enviado' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {relatorio.status === 'enviado' ? 'Enviado' : 'Falhou'}
                  </span>
                </div>
                <button
                  onClick={() => handleReenviarRelatorio(relatorio.data)}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface-variant transition-colors"
                >
                  Reenviar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
