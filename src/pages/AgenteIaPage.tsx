import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

type Pedido = {
  id: string
  numero: number
  cliente_nome: string
  total: number
  status: string
  canal: string
  created_at: string
  updated_at: string
}

type Configuracoes = {
  agente_atendente_ativo: boolean
  whatsapp_atendente: string | null
}

type AnaliseData = {
  positivos: string[]
  atencao: string[]
  sugestoes: Array<{ titulo: string; descricao: string; action: string }>
}

type ChatMessage = {
  role: 'user' | 'agent'
  content: string
}

type RelatorioDiario = {
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

const getStatusBadge = (status: string) => {
  const s = mapKanbanStatus(status)
  const config: Record<string, { bg: string; text: string; label: string }> = {
    novo: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Novo' },
    em_preparo: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Em Preparo' },
    preparando: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Preparando' },
    pronto: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Pronto' },
    saiu_entrega: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Saiu' },
    entregue: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Entregue' },
    cancelado: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelado' },
  }
  return config[s] || config.novo
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}min`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ${diffHours % 24}h`
}

function getTimeColor(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins >= 30) return 'text-red-500 animate-pulse'
  if (diffMins >= 15) return 'text-yellow-500'
  return 'text-[#dde0ee]'
}

export default function AgenteIaPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'atendente' | 'gestor'>('atendente')
  const [toast, setToast] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const tenantId = user?.id

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const { data: configuracoes, isLoading: configLoading } = useQuery({
    queryKey: ['configuracoes', tenantId],
    queryFn: async () => {
      if (!tenantId) return null
      const { data } = await supabase
        .from('configuracoes')
        .select('agente_atendente_ativo, whatsapp_atendente')
        .eq('tenant_id', tenantId)
        .single()
      return data as Configuracoes | null
    },
    enabled: !!tenantId,
  })

  const { mutate: toggleAgente, isPending: toggling } = useMutation({
    mutationFn: async () => {
      if (!tenantId || !configuracoes) return
      const novoValor = !configuracoes.agente_atendente_ativo
      await supabase
        .from('configuracoes')
        .update({ agente_atendente_ativo: novoValor })
        .eq('tenant_id', tenantId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', tenantId] })
      showToast(configuracoes?.agente_atendente_ativo ? 'Agente desativado' : 'Agente ativado!')
    },
    onError: () => {
      showToast('Erro ao atualizar configuração')
    },
  })

  const fetchFilaPendente = useCallback(async () => {
    if (!tenantId) return []
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, total, status, canal, created_at')
      .eq('tenant_id', tenantId)
      .eq('canal', 'whatsapp')
      .eq('status', 'novo')
      .order('created_at', { ascending: true })
    return (data || []) as Pedido[]
  }, [tenantId])

  const [filaPendente, setFilaPendente] = useState<Pedido[]>([])

  useEffect(() => {
    fetchFilaPendente().then(setFilaPendente)
  }, [fetchFilaPendente])

  useRealtime('pedidos', () => {
    fetchFilaPendente().then(setFilaPendente)
  })

  const fetchConversasAtivas = useCallback(async () => {
    if (!tenantId) return []
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, cliente_nome, total, status, canal, updated_at')
      .eq('tenant_id', tenantId)
      .eq('canal', 'whatsapp')
      .not('status', 'in', '("entregue","cancelado","novo")')
      .order('updated_at', { ascending: false })
    return (data || []) as Pedido[]
  }, [tenantId])

  const [conversasAtivas, setConversasAtivas] = useState<Pedido[]>([])

  useEffect(() => {
    fetchConversasAtivas().then(setConversasAtivas)
  }, [fetchConversasAtivas])

  useRealtime('pedidos', () => {
    fetchConversasAtivas().then(setConversasAtivas)
  })

  const { data: historicoData, refetch: refetchHistorico } = useQuery({
    queryKey: ['whatsapp-history', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data } = await supabase
        .from('pedidos')
        .select('id, numero, cliente_nome, total, status, canal, updated_at')
        .eq('tenant_id', tenantId)
        .eq('canal', 'whatsapp')
        .in('status', ['entregue', 'cancelado'])
        .order('updated_at', { ascending: false })
        .limit(10)
      return (data || []) as Pedido[]
    },
    enabled: activeTab === 'atendente' && !!tenantId,
  })

  const { data: analiseData, isLoading: analiseLoading, error: analiseError, refetch: refetchAnalise } = useQuery({
    queryKey: ['consultant-analise', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, modo: 'analise' },
      })
      if (error) throw error
      return data as AnaliseData
    },
    enabled: activeTab === 'gestor' && !!tenantId,
  })

  const [sugestoesLocais, setSugestoesLocais] = useState<AnaliseData['sugestoes']>([])

  useEffect(() => {
    if (analiseData?.sugestoes) {
      setSugestoesLocais(analiseData.sugestoes)
    }
  }, [analiseData])

  const { mutate: executarAcao, isPending: executando } = useMutation({
    mutationFn: async (sugestao: { titulo: string; action: string }) => {
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'executado',
        descricao: sugestao.titulo,
        executado_em: new Date().toISOString(),
      })
      setSugestoesLocais((prev) => prev.filter((s) => s.titulo !== sugestao.titulo))
    },
    onSuccess: () => {
      showToast('Ação executada com sucesso!')
    },
    onError: () => {
      showToast('Erro ao executar ação')
    },
  })

  const { mutate: ignorarAcao } = useMutation({
    mutationFn: async (titulo: string) => {
      await supabase.from('historico_agente').insert({
        tenant_id: tenantId,
        tipo: 'ignorado',
        descricao: titulo,
      })
      setSugestoesLocais((prev) => prev.filter((s) => s.titulo !== titulo))
    },
  })

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')

  const { mutate: sendChatMessage, isPending: chatLoading } = useMutation({
    mutationFn: async (mensagem: string) => {
      const { data, error } = await supabase.functions.invoke('consultant-agent', {
        body: { tenant_id: tenantId, mensagem, modo: 'chat' },
      })
      if (error) throw error
      return data as { resposta: string }
    },
    onSuccess: (data) => {
      setChatHistory((prev) => [...prev, { role: 'agent', content: data.resposta }])
    },
  })

  const handleSendChat = () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatHistory((prev) => [...prev, { role: 'user', content: userMsg }])
    sendChatMessage(userMsg)
    setChatInput('')
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const { data: relatoriosData } = useQuery({
    queryKey: ['relatorios-diarios', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      try {
        const { data } = await supabase
          .from('relatorios_diarios')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('data', { ascending: false })
          .limit(5)
        return (data || []) as RelatorioDiario[]
      } catch {
        return []
      }
    },
    enabled: activeTab === 'gestor' && !!tenantId,
  })

  const { mutate: reenviarRelatorio, isPending: reenviando } = useMutation({
    mutationFn: async (dataRelatorio: string) => {
      await supabase.functions.invoke('relatorio-diario', {
        body: { tenant_id: tenantId, data: dataRelatorio },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-diarios'] })
    },
  })

  const subtitle = activeTab === 'atendente' 
    ? 'Gerencie seus pedidos do WhatsApp em tempo real' 
    : 'Análise inteligente e consultiva do seu negócio'

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col p-4 md:p-8 animate-fade-in bg-background">
      <header className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-[#dde0ee] tracking-tighter" style={{ fontFamily: 'Syne, sans-serif' }}>
            Agente IA
          </h1>
          <p className="text-[#dde0ee]/60 text-sm mt-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{subtitle}</p>
        </div>
      </header>

      <div className="flex gap-2 mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('atendente')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'atendente'
              ? 'bg-[#e8391a] text-white shadow-lg'
              : 'bg-[#16181f] text-[#dde0ee]/60 hover:bg-[#252830] border border-[#252830]'
          }`}
        >
          Atendente
        </button>
        <button
          onClick={() => setActiveTab('gestor')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'gestor'
              ? 'bg-[#e8391a] text-white shadow-lg'
              : 'bg-[#16181f] text-[#dde0ee]/60 hover:bg-[#252830] border border-[#252830]'
          }`}
        >
          Gestor Consultor
        </button>
      </div>

      {activeTab === 'atendente' && (
        <div className="flex-1 overflow-y-auto space-y-6">
          <section>
            <div 
              className="rounded-xl p-5 border"
              style={{ backgroundColor: '#16181f', borderColor: '#252830' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div 
                      className={`w-3 h-3 rounded-full ${configuracoes?.agente_atendente_ativo ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
                    />
                    {configuracoes?.agente_atendente_ativo && (
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#dde0ee]" style={{ fontFamily: 'Syne, sans-serif' }}>
                      Agente Atendente
                    </h3>
                    <p className="text-xs text-[#dde0ee]/50">
                      {configuracoes?.agente_atendente_ativo ? 'Ativo e respondendo' : 'Inativo'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAgente()}
                  disabled={toggling || configLoading}
                  className={`w-12 h-6 rounded-full transition-all relative ${configuracoes?.agente_atendente_ativo ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div 
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${configuracoes?.agente_atendente_ativo ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: '#252830' }}>
                <p className="text-xs text-[#dde0ee]/50 mb-1">WhatsApp configurado</p>
                {configuracoes?.whatsapp_atendente ? (
                  <p className="text-sm text-[#dde0ee]">{configuracoes.whatsapp_atendente}</p>
                ) : (
                  <p className="text-sm text-yellow-500">Número não configurado — acione Configurações</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#dde0ee] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="material-symbols-outlined text-[#e8391a]">hourglass_empty</span>
              Fila Pendente
              <span className="text-xs bg-[#e8391a]/20 text-[#e8391a] px-2 py-0.5 rounded-full">
                {filaPendente.length}
              </span>
            </h2>
            {filaPendente.length === 0 ? (
              <div className="text-center py-10 opacity-40" style={{ backgroundColor: '#16181f', borderRadius: '12px', border: '1px solid #252830' }}>
                <span className="material-symbols-outlined text-5xl text-[#dde0ee]">inbox</span>
                <p className="mt-2 font-bold text-[#dde0ee]">Nenhum pedido aguardando atendimento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filaPendente.map((pedido) => {
                  const timeColor = getTimeColor(pedido.created_at)
                  return (
                    <div
                      key={pedido.id}
                      className="p-4 rounded-xl border transition-all hover:border-[#e8391a]/30"
                      style={{ backgroundColor: '#16181f', borderColor: '#252830' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs font-bold uppercase text-[#dde0ee]/50">
                            #{String(pedido.numero).padStart(4, '0')}
                          </span>
                          <h3 className="font-bold text-[#dde0ee] truncate">{pedido.cliente_nome}</h3>
                        </div>
                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-400">
                          Novo
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-green-400 font-bold">R$ {Number(pedido.total).toFixed(2)}</span>
                        <span className={`text-xs font-mono ${timeColor}`}>
                          {formatTimeAgo(pedido.created_at)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#dde0ee] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="material-symbols-outlined text-[#e8391a]">chat</span>
              Conversas Ativas
              <span className="text-xs bg-[#f57c24]/20 text-[#f57c24] px-2 py-0.5 rounded-full">
                {conversasAtivas.length}
              </span>
            </h2>
            {conversasAtivas.length === 0 ? (
              <div className="text-center py-10 opacity-40" style={{ backgroundColor: '#16181f', borderRadius: '12px', border: '1px solid #252830' }}>
                <span className="material-symbols-outlined text-5xl text-[#dde0ee]">forum</span>
                <p className="mt-2 font-bold text-[#dde0ee]">Nenhuma conversa ativa</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {conversasAtivas.map((pedido) => {
                  const badge = getStatusBadge(pedido.status)
                  return (
                    <div
                      key={pedido.id}
                      className="p-4 rounded-xl border transition-all hover:border-[#e8391a]/30"
                      style={{ backgroundColor: '#16181f', borderColor: '#252830' }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-[#dde0ee] truncate">{pedido.cliente_nome}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-green-400 font-bold">R$ {Number(pedido.total).toFixed(2)}</span>
                        <span className="text-xs text-[#dde0ee]/50">
                          {format(parseISO(pedido.updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
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
              <h2 className="text-lg font-bold text-[#dde0ee] flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                <span className="material-symbols-outlined text-[#e8391a]">history</span>
                Histórico Recente
              </h2>
              <button
                onClick={() => refetchHistorico()}
                className="px-4 py-2 rounded-lg text-[#dde0ee]/60 text-sm font-bold hover:bg-[#252830] transition-colors flex items-center gap-2 border border-[#252830]"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Atualizar
              </button>
            </div>
            {historicoData && historicoData.length > 0 ? (
              <div className="space-y-2">
                {historicoData.map((pedido) => {
                  const badge = getStatusBadge(pedido.status)
                  return (
                    <div
                      key={pedido.id}
                      className="p-3 rounded-xl flex justify-between items-center border"
                      style={{ backgroundColor: 'rgba(22, 24, 31, 0.3)', borderColor: '#252830' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#dde0ee]">#{String(pedido.numero).padStart(4, '0')}</span>
                        <span className="text-sm text-[#dde0ee] truncate max-w-[150px]">{pedido.cliente_nome}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-green-400 font-bold text-sm">R$ {Number(pedido.total).toFixed(2)}</span>
                        <span className="text-xs text-[#dde0ee]/50">
                          {format(parseISO(pedido.updated_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 opacity-40" style={{ backgroundColor: '#16181f', borderRadius: '12px', border: '1px solid #252830' }}>
                <span className="material-symbols-outlined text-4xl text-[#dde0ee]">history</span>
                <p className="mt-2 text-sm text-[#dde0ee]">Nenhum histórico encontrado</p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'gestor' && (
        <div className="flex-1 overflow-y-auto space-y-8">
          <section>
            <h2 className="text-lg font-bold text-[#dde0ee] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="material-symbols-outlined text-[#e8391a]">analytics</span>
              Análise do Consultant
            </h2>

            {analiseLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#16181f] p-6 rounded-xl animate-pulse" style={{ border: '1px solid #252830' }}>
                    <div className="h-4 bg-[#252830] rounded w-1/2 mb-4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-[#252830] rounded w-3/4" />
                      <div className="h-3 bg-[#252830] rounded w-2/3" />
                      <div className="h-3 bg-[#252830] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {analiseError && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                <p className="text-red-400 text-sm">Erro ao carregar análise. Tente novamente.</p>
                <button
                  onClick={() => refetchAnalise()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {analiseData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-r-xl border-l-4" style={{ borderLeftColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
                  <h3 className="font-bold flex items-center gap-2 mb-3" style={{ color: '#22c55e', fontFamily: 'Syne, sans-serif' }}>
                    <span>✅</span> Pontos Positivos
                  </h3>
                  <ul className="space-y-2">
                    {analiseData.positivos.map((item, i) => (
                      <li key={i} className="text-sm text-[#dde0ee] flex gap-2">
                        <span style={{ color: '#22c55e' }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-r-xl border-l-4" style={{ borderLeftColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.05)' }}>
                  <h3 className="font-bold flex items-center gap-2 mb-3" style={{ color: '#eab308', fontFamily: 'Syne, sans-serif' }}>
                    <span>⚠️</span> Pontos de Atenção
                  </h3>
                  <ul className="space-y-2">
                    {analiseData.atencao.map((item, i) => (
                      <li key={i} className="text-sm text-[#dde0ee] flex gap-2">
                        <span style={{ color: '#eab308' }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-r-xl border-l-4" style={{ borderLeftColor: '#f57c24', backgroundColor: 'rgba(245, 124, 36, 0.05)' }}>
                  <h3 className="font-bold flex items-center gap-2 mb-3" style={{ color: '#f57c24', fontFamily: 'Syne, sans-serif' }}>
                    <span>🎯</span> Sugestões de Ação
                  </h3>
                  <div className="space-y-3">
                    {sugestoesLocais.map((sugestao, i) => (
                      <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: '#16181f', borderColor: '#252830' }}>
                        <p className="font-bold text-[#dde0ee] text-sm">{sugestao.titulo}</p>
                        <p className="text-xs text-[#dde0ee]/60 mt-1">{sugestao.descricao}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => executarAcao(sugestao)}
                            disabled={executando}
                            className="flex-1 py-1.5 bg-[#e8391a] text-white rounded-lg text-xs font-bold hover:bg-[#e8391a]/90 transition-colors"
                          >
                            Executar
                          </button>
                          <button
                            onClick={() => ignorarAcao(sugestao.titulo)}
                            className="flex-1 py-1.5 border border-[#252830] text-[#dde0ee]/60 rounded-lg text-xs font-bold hover:bg-[#252830] transition-colors"
                          >
                            Ignorar
                          </button>
                        </div>
                      </div>
                    ))}
                    {sugestoesLocais.length === 0 && (
                      <p className="text-sm text-[#dde0ee]/60">Nenhuma sugestão no momento</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#dde0ee] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="material-symbols-outlined text-[#e8391a]">chat</span>
              Chat Livre
            </h2>
            <div className="rounded-xl border max-h-[400px] flex flex-col" style={{ backgroundColor: '#16181f', borderColor: '#252830' }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[300px]">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'agent' && (
                      <div className="w-8 h-8 rounded-full bg-[#252830] flex items-center justify-center mr-2 shrink-0">
                        <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-[#e8391a] text-white rounded-br-sm'
                          : 'bg-[#252830] text-white rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t flex gap-2" style={{ borderColor: '#252830' }}>
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
                  disabled={chatLoading}
                  className="flex-1 rounded-xl p-3 text-sm text-[#dde0ee] border outline-none resize-none h-12"
                  style={{ backgroundColor: '#0d0e12', borderColor: '#252830' }}
                />
                <button
                  onClick={handleSendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 bg-[#e8391a] text-white rounded-xl font-bold text-sm hover:bg-[#e8391a]/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                >
                  {chatLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Enviar'
                  )}
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#dde0ee] mb-4 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="material-symbols-outlined text-[#e8391a]">description</span>
              Relatórios Diários
            </h2>
            {relatoriosData && relatoriosData.length > 0 ? (
              <div className="space-y-2">
                {relatoriosData.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-4 rounded-xl flex justify-between items-center border"
                    style={{ backgroundColor: 'rgba(22, 24, 31, 0.3)', borderColor: '#252830' }}
                  >
                    <div>
                      <p className="font-bold text-[#dde0ee]">
                        {format(parseISO(rel.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${
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
                      disabled={reenviando}
                      className="px-4 py-2 text-[#dde0ee]/60 rounded-lg text-sm font-bold hover:bg-[#252830] transition-colors border border-[#252830]"
                    >
                      {reenviando ? 'Enviando...' : 'Reenviar'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 rounded-xl" style={{ backgroundColor: 'rgba(22, 24, 31, 0.3)', border: '1px solid #252830' }}>
                <span className="material-symbols-outlined text-4xl text-[#dde0ee]/30">description</span>
                <p className="mt-2 text-sm text-[#dde0ee]/60">
                  Nenhum relatório enviado ainda. O primeiro será enviado hoje às 23h.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
