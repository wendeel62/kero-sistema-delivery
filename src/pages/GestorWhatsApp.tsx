import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

const mapKanbanStatus = (rawStatus: string) => {
  if (['aberto', 'pendente', 'confirmado'].includes(rawStatus)) return 'novo'
  if (rawStatus === 'preparando') return 'em_preparo'
  if (['pronto', 'saiu_entrega'].includes(rawStatus)) return 'saiu_entrega'
  if (rawStatus === 'entregue') return 'entregue'
  return 'cancelado'
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  novo: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500' },
  em_preparo: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500' },
  saiu_entrega: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' },
  entregue: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' },
  cancelado: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500' },
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  em_preparo: 'Em Preparo',
  saiu_entrega: 'Saiu p/ Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

function getStatusStyle(status: string) {
  const s = mapKanbanStatus(status)
  return STATUS_COLORS[s] || STATUS_COLORS.novo
}

function SkeletonCard() {
  return (
    <div className="bg-surface p-4 rounded-xl border border-outline-variant/10 animate-pulse">
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-3 w-16 bg-surface-container rounded" />
          <div className="h-4 w-24 bg-surface-container rounded" />
        </div>
        <div className="h-6 w-14 bg-surface-container rounded" />
      </div>
      <div className="mt-3 h-4 w-20 bg-surface-container rounded" />
    </div>
  )
}

function SkeletonAnalise() {
  return (
    <div className="bg-surface p-5 rounded-xl border border-outline-variant/10 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-6 bg-surface-container rounded" />
        <div className="h-4 w-32 bg-surface-container rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-surface-container rounded" />
        <div className="h-3 w-3/4 bg-surface-container rounded" />
        <div className="h-3 w-5/6 bg-surface-container rounded" />
      </div>
    </div>
  )
}

interface PedidoWhatsapp {
  id: string
  numero: number
  cliente_nome: string
  total: number
  status: string
  created_at: string
  updated_at: string
  canal: string
}

export default function GestorWhatsApp() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'consultor'>('whatsapp')
  const [tenantId, setTenantId] = useState<string>('')

  useEffect(() => {
    const fetchTenant = async () => {
      const { data } = await supabase.from('configuracoes').select('id').limit(1).maybeSingle()
      if (data?.id) setTenantId(data.id)
    }
    fetchTenant()
  }, [])

  const fetchPedidosAtivos = useCallback(async (): Promise<PedidoWhatsapp[]> => {
    if (!tenantId) return []
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('canal', 'whatsapp')
      .not('status', 'in', "('entregue','cancelado','novo')")
      .order('updated_at', { ascending: false })
      .limit(50)
    return (data || []).map(p => ({
      ...p,
      status_kanban: mapKanbanStatus(p.status)
    }))
  }, [tenantId])

  const { data: pedidosAtivos = [], isLoading: loadingAtivos, refetch: refetchAtivos } = useQuery({
    queryKey: ['pedidos-whatsapp-ativos', tenantId],
    queryFn: fetchPedidosAtivos,
    enabled: !!tenantId,
  })

  useRealtime('pedidos', () => {
    refetchAtivos()
  })

  const { data: historicoRecente = [], isLoading: loadingHistorico, refetch: refetchHistorico } = useQuery({
    queryKey: ['historico-whatsapp', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('canal', 'whatsapp')
        .in('status', ['entregue', 'cancelado'])
        .order('updated_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!tenantId && activeTab === 'whatsapp',
  })

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col animate-fade-in p-4 md:p-8">
      <header className="mb-6 shrink-0">
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tighter">Gestor WhatsApp</h1>
        <p className="text-on-surface-variant font-body mt-1">Gerenciamento de pedidos via WhatsApp e análise IA</p>
      </header>

      <div className="flex gap-2 mb-6 border-b border-outline-variant/10 shrink-0">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-6 py-3 rounded-t-xl font-bold text-sm transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('consultor')}
          className={`px-6 py-3 rounded-t-xl font-bold text-sm transition-all ${
            activeTab === 'consultor'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Gestor Consultor
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'whatsapp' ? (
          <AbaWhatsApp
            tenantId={tenantId}
            pedidosAtivos={pedidosAtivos}
            loadingAtivos={loadingAtivos}
            historicoRecente={historicoRecente}
            loadingHistorico={loadingHistorico}
            refetchAtivos={refetchAtivos}
            refetchHistorico={refetchHistorico}
          />
        ) : (
          <AbaConsultor tenantId={tenantId} />
        )}
      </div>
    </div>
  )
}

function AbaWhatsApp({
  tenantId,
  pedidosAtivos,
  loadingAtivos,
  historicoRecente,
  loadingHistorico,
  refetchAtivos,
  refetchHistorico,
}: {
  tenantId: string
  pedidosAtivos: PedidoWhatsapp[]
  loadingAtivos: boolean
  historicoRecente: PedidoWhatsapp[]
  loadingHistorico: boolean
  refetchAtivos: () => void
  refetchHistorico: () => void
}) {
  return (
    <div className="h-full overflow-y-auto space-y-8 pb-4">
      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-500">chat</span>
          Pedidos Ativos WhatsApp
        </h2>
        {loadingAtivos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : pedidosAtivos.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant/40">
            <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
            <p>Nenhum pedido ativo via WhatsApp</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidosAtivos.map(pedido => (
              <PedidoCard key={pedido.id} pedido={pedido} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">history</span>
            Histórico Recente
          </h2>
          <button
            onClick={() => refetchHistorico()}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface-variant transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Atualizar
          </button>
        </div>
        {loadingHistorico ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : historicoRecente.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant/40 border border-dashed border-outline-variant/20 rounded-xl">
            <span className="material-symbols-outlined text-4xl mb-2">description</span>
            <p className="text-sm">Nenhum histórico recente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {historicoRecente.map(pedido => (
              <HistoricoCard key={pedido.id} pedido={pedido} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function PedidoCard({ pedido }: { pedido: PedidoWhatsapp }) {
  const style = getStatusStyle(pedido.status)
  const updatedDate = parseISO(pedido.updated_at)

  return (
    <div className="bg-surface p-4 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all shadow-lg">
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
            #{String(pedido.numero).padStart(4, '0')}
          </span>
          <h3 className="font-headline font-bold text-sm text-on-surface truncate">
            {pedido.cliente_nome}
          </h3>
        </div>
        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${style.bg} ${style.text}`}>
          {STATUS_LABELS[mapKanbanStatus(pedido.status)] || pedido.status}
        </span>
      </div>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-green-400 font-headline font-bold text-sm">
          R$ {Number(pedido.total).toFixed(2)}
        </span>
        <span className="text-[10px] text-on-surface-variant">
          {format(updatedDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
        </span>
      </div>
    </div>
  )
}

function HistoricoCard({ pedido }: { pedido: PedidoWhatsapp }) {
  const style = getStatusStyle(pedido.status)
  const updatedDate = parseISO(pedido.updated_at)

  return (
    <div className="bg-surface p-3 rounded-xl border border-outline-variant/5 flex justify-between items-center gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-bold text-on-surface-variant">#{String(pedido.numero).padStart(4, '0')}</span>
        <span className="text-sm text-on-surface truncate">{pedido.cliente_nome}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${style.bg} ${style.text}`}>
          {STATUS_LABELS[mapKanbanStatus(pedido.status)] || pedido.status}
        </span>
        <span className="text-green-400 font-bold text-xs">R$ {Number(pedido.total).toFixed(2)}</span>
        <span className="text-[10px] text-on-surface-variant whitespace-nowrap">
          {format(updatedDate, 'dd/MM', { locale: ptBR })}
        </span>
      </div>
    </div>
  )
}

function AbaConsultor({ tenantId }: { tenantId: string }) {
  const [sugestoes, setSugestoes] = useState<Array<{ titulo: string; descricao: string; action: string }>>([])
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'agent'; content: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)

  const { data: analiseData, isLoading: loadingAnalise, error: errorAnalise, refetch: refetchAnalise } = useQuery({
    queryKey: ['consultor-analise', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, modo: 'analise' }
      })
      if (error) throw error
      return data as { positivos: string[]; atencao: string[]; sugestoes: Array<{ titulo: string; descricao: string; action: string }> }
    },
    enabled: !!tenantId,
  })

  const { data: relatorios = [], isLoading: loadingRelatorios } = useQuery({
    queryKey: ['relatorios-diarios', tenantId],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('relatorios_diarios')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('data', { ascending: false })
          .limit(5)
        return data || []
      } catch {
        return []
      }
    },
    enabled: !!tenantId,
  })

  useEffect(() => {
    if (analiseData?.sugestoes) {
      setSugestoes(analiseData.sugestoes)
    }
  }, [analiseData])

  const handleExecutar = async (index: number, item: { titulo: string; action: string }) => {
    setSugestoes(prev => prev.filter((_, i) => i !== index))
    await supabase.from('historico_agente').insert({
      tenant_id: tenantId,
      tipo: 'executado',
      descricao: item.titulo,
      executado_em: new Date().toISOString()
    })
  }

  const handleIgnorar = async (index: number, item: { titulo: string }) => {
    setSugestoes(prev => prev.filter((_, i) => i !== index))
    await supabase.from('historico_agente').insert({
      tenant_id: tenantId,
      tipo: 'ignorado',
      descricao: item.titulo
    })
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || sendingChat) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setSendingChat(true)
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      const { data } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, mensagem: userMsg, modo: 'chat' }
      })
      if (data?.resposta) {
        setChatMessages(prev => [...prev, { role: 'agent', content: data.resposta }])
      }
    } catch (err) {
      console.error('Erro no chat:', err)
    } finally {
      setSendingChat(false)
    }
  }

  const resendRelatorio = async (data: string) => {
    await supabase.functions.invoke('relatorio-diario', {
      body: { tenant_id: tenantId, data }
    })
  }

  return (
    <div className="h-full overflow-y-auto space-y-8 pb-4">
      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">analytics</span>
          Análise Inteligente
        </h2>

        {loadingAnalise ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonAnalise />
            <SkeletonAnalise />
            <SkeletonAnalise />
          </div>
        ) : errorAnalise ? (
          <div className="bg-error/10 border border-error/20 p-4 rounded-xl flex items-center justify-between">
            <span className="text-error text-sm">Erro ao carregar análise</span>
            <button
              onClick={() => refetchAnalise()}
              className="px-3 py-1.5 bg-error text-on-error rounded-lg text-xs font-bold"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-500/5 border-l-4 border-green-500 p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">✅</span>
                <h3 className="font-headline font-bold text-green-500">Pontos Positivos</h3>
              </div>
              <ul className="space-y-2">
                {(analiseData?.positivos || []).map((item, i) => (
                  <li key={i} className="text-sm text-on-surface flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-500/5 border-l-4 border-yellow-500 p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⚠️</span>
                <h3 className="font-headline font-bold text-yellow-500">Pontos de Atenção</h3>
              </div>
              <ul className="space-y-2">
                {(analiseData?.atencao || []).map((item, i) => (
                  <li key={i} className="text-sm text-on-surface flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-500/5 border-l-4 border-orange-500 p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🎯</span>
                <h3 className="font-headline font-bold text-orange-500">Sugestões de Ação</h3>
              </div>
              <div className="space-y-3">
                {sugestoes.map((item, i) => (
                  <div key={i} className="bg-surface p-3 rounded-lg border border-outline-variant/10">
                    <p className="text-sm font-bold text-on-surface">{item.titulo}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{item.descricao}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleExecutar(i, item)}
                        className="px-2 py-1 bg-[#e8391a] text-white text-[10px] font-bold rounded hover:bg-[#e8391a]/80"
                      >
                        Executar
                      </button>
                      <button
                        onClick={() => handleIgnorar(i, item)}
                        className="px-2 py-1 border border-outline-variant text-on-surface-variant text-[10px] font-bold rounded hover:bg-surface-container"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                ))}
                {sugestoes.length === 0 && (
                  <p className="text-xs text-on-surface-variant/60">Nenhuma sugestão no momento</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">chat</span>
          Chat Livre
        </h2>
        <div className="bg-surface-container rounded-xl border border-outline-variant/10 flex flex-col" style={{ maxHeight: '500px' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '350px' }}>
            {chatMessages.length === 0 ? (
              <div className="text-center text-on-surface-variant/40 py-8">
                <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                <p className="text-sm">Como posso ajudar seu restaurante hoje?</p>
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
                        : 'bg-[#252830] text-white rounded-bl-md flex items-start gap-2'
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
          <div className="p-3 border-t border-outline-variant/10 flex gap-2">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendChat())}
              placeholder="Digite sua mensagem..."
              disabled={sendingChat}
              className="flex-1 bg-surface rounded-xl p-3 text-sm text-on-surface border border-outline-variant/10 outline-none focus:border-primary resize-none"
              rows={1}
            />
            <button
              onClick={handleSendChat}
              disabled={sendingChat || !chatInput.trim()}
              className="px-4 bg-primary text-on-primary rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center min-w-[80px]"
            >
              {sendingChat ? (
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                'Enviar'
              )}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">description</span>
          Relatórios Diários
        </h2>
        {loadingRelatorios ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : relatorios.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant/40 border border-dashed border-outline-variant/20 rounded-xl">
            <span className="material-symbols-outlined text-4xl mb-2">description</span>
            <p className="text-sm">Nenhum relatório enviado ainda. O primeiro será enviado hoje às 23h.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {relatorios.map(rel => (
              <div key={rel.id} className="bg-surface p-4 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-on-surface">
                    {format(parseISO(rel.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rel.status === 'enviado' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {rel.status === 'enviado' ? 'Enviado' : 'Falhou'}
                  </span>
                </div>
                {rel.status === 'falhou' && (
                  <button
                    onClick={() => resendRelatorio(rel.data)}
                    className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg"
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
  )
}
