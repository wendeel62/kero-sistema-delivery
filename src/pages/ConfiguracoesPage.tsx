import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../contexts/AuthContext'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface Config {
  id: string
  nome_loja: string
  telefone: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  cnpj: string
  horario_abertura: string
  horario_fechamento: string
  taxa_entrega: number
  pedido_minimo: number
  raio_entrega_km: number
  loja_aberta: boolean
  aceita_pix: boolean
  aceita_cartao: boolean
  aceita_dinheiro: boolean
  cor_primaria: string
  total_mesas: number
  capacidade_mesa: number
  modulo_mesas_ativado: boolean
  agente_atendente_ativo: boolean
  whatsapp_atendente: string | null
}

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

const InputField = ({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) => (
  <div>
    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 block">{label}</label>
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-[#16181f] border border-[#252830] rounded-xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-[#e8391a] transition-all" />
  </div>
)

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center justify-between p-4 bg-[#252830] rounded-xl cursor-pointer hover:bg-[#333] transition-all">
    <span className="text-sm font-bold text-white">{label}</span>
    <div className={`w-12 h-7 rounded-full transition-all relative ${checked ? 'bg-[#e8391a]' : 'bg-[#1a1a1a]'}`} onClick={() => onChange(!checked)}>
      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  </label>
)

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [config, setConfig] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'config' | 'atendente' | 'gestor'>('config')
  const [toast, setToast] = useState<string | null>(null)

  const tenantId = user?.id

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const { data: agenteConfig } = useQuery({
    queryKey: ['agente-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null
      const { data } = await supabase
        .from('configuracoes')
        .select('agente_atendente_ativo, whatsapp_atendente')
        .eq('tenant_id', tenantId)
        .single()
      return data
    },
    enabled: !!tenantId,
  })

  const { mutate: toggleAgente, isPending: toggling } = useMutation({
    mutationFn: async () => {
      if (!tenantId || !agenteConfig) return
      const novoValor = !agenteConfig.agente_atendente_ativo
      await supabase
        .from('configuracoes')
        .update({ agente_atendente_ativo: novoValor })
        .eq('tenant_id', tenantId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agente-config', tenantId] })
      showToast(agenteConfig?.agente_atendente_ativo ? 'Agente desativado' : 'Agente ativado!')
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
    if (activeTab === 'atendente') {
      fetchFilaPendente().then(setFilaPendente)
    }
  }, [activeTab, fetchFilaPendente])

  useRealtime('pedidos', () => {
    if (activeTab === 'atendente') fetchFilaPendente().then(setFilaPendente)
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

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from('configuracoes').select('*').limit(1).single()
    if (data) setConfig(data)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])
  useRealtime('configuracoes', fetchConfig)

  const update = (key: keyof Config, value: unknown) => {
    if (config) setConfig({ ...config, [key]: value })
  }

  const save = async () => {
    if (!config) return
    setSaving(true)
    const { id, ...rest } = config
    await supabase.from('configuracoes').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!config) return (<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#e8391a] border-t-transparent rounded-full animate-spin" /></div>)

  return (
    <div className="animate-fade-in p-3 sm:p-4 md:p-6">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[#e8391a] font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Sistema</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-[Outfit] font-bold text-white tracking-tighter">Configurações</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => setActiveTab('config')} className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'config' ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400 border border-[#252830]'}`}>Loja</button>
          <button onClick={() => setActiveTab('atendente')} className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'atendente' ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400 border border-[#252830]'}`}>Atendente IA</button>
          <button onClick={() => setActiveTab('gestor')} className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'gestor' ? 'bg-[#e8391a] text-white' : 'bg-[#1a1a1a] text-gray-400 border border-[#252830]'}`}>Gestor</button>
        </div>
        {activeTab === 'config' && (
          <button onClick={save} disabled={saving} className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-[#e8391a] text-white'} disabled:opacity-50`}>
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        )}
      </div>

      {activeTab === 'config' && (
        <>
          {/* Seção: Dados da Loja */}
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
            <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-[#e8391a]">store</span> Dados da Loja
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Nome da Loja" value={config.nome_loja} onChange={v => update('nome_loja', v)} />
              <InputField label="Telefone" value={config.telefone} onChange={v => update('telefone', v)} />
              <InputField label="CNPJ" value={config.cnpj} onChange={v => update('cnpj', v)} />
              <InputField label="CEP" value={config.cep} onChange={v => update('cep', v)} />
              <InputField label="Endereço" value={config.endereco} onChange={v => update('endereco', v)} />
              <InputField label="Cidade" value={config.cidade} onChange={v => update('cidade', v)} />
              <InputField label="Estado" value={config.estado} onChange={v => update('estado', v)} />
              <InputField label="WhatsApp Atendente (para Agente IA)" value={config.whatsapp_atendente || ''} onChange={v => update('whatsapp_atendente', v)} />
            </div>
          </div>

          {/* Seção: Funcionamento */}
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
            <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-[#e8391a]">schedule</span> Funcionamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <InputField label="Horário Abertura" value={config.horario_abertura} onChange={v => update('horario_abertura', v)} type="time" />
              <InputField label="Horário Fechamento" value={config.horario_fechamento} onChange={v => update('horario_fechamento', v)} type="time" />
            </div>
            <Toggle label="Loja Aberta" checked={config.loja_aberta} onChange={v => update('loja_aberta', v)} />
          </div>

          {/* Seção: Delivery */}
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
            <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-[#e8391a]">local_shipping</span> Delivery
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Taxa de Entrega (R$)" value={config.taxa_entrega} onChange={v => update('taxa_entrega', Number(v))} type="number" />
              <InputField label="Pedido Mínimo (R$)" value={config.pedido_minimo} onChange={v => update('pedido_minimo', Number(v))} type="number" />
              <InputField label="Raio de Entrega (KM)" value={config.raio_entrega_km} onChange={v => update('raio_entrega_km', Number(v))} type="number" />
            </div>
          </div>

          {/* Seção: Pagamentos */}
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830]">
            <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-[#e8391a]">payments</span> Formas de Pagamento
            </h3>
            <div className="space-y-3">
              <Toggle label="Aceita PIX" checked={config.aceita_pix} onChange={v => update('aceita_pix', v)} />
              <Toggle label="Aceita Cartão" checked={config.aceita_cartao} onChange={v => update('aceita_cartao', v)} />
              <Toggle label="Aceita Dinheiro" checked={config.aceita_dinheiro} onChange={v => update('aceita_dinheiro', v)} />
            </div>
          </div>

          {/* Seção: Mesas */}
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mt-6">
            <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-[#e8391a]">table_restaurant</span> Mesas
            </h3>
            <div className="space-y-4">
              <Toggle label="Módulo de Mesas Ativado" checked={config.modulo_mesas_ativado ?? true} onChange={v => update('modulo_mesas_ativado', v)} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Número Total de Mesas" value={config.total_mesas ?? 10} onChange={v => update('total_mesas', Number(v))} type="number" />
                <InputField label="Capacidade por Mesa" value={config.capacidade_mesa ?? 4} onChange={v => update('capacidade_mesa', Number(v))} type="number" />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'atendente' && (
        <div className="space-y-6">
          <div className="rounded-xl p-5 border bg-[#16181f] border-[#252830]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${agenteConfig?.agente_atendente_ativo ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  {agenteConfig?.agente_atendente_ativo && (
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white">Agente Atendente</h3>
                  <p className="text-xs text-gray-500">
                    {agenteConfig?.agente_atendente_ativo ? 'Ativo e respondendo' : 'Inativo'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleAgente()}
                disabled={toggling}
                className={`w-12 h-6 rounded-full transition-all relative ${agenteConfig?.agente_atendente_ativo ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${agenteConfig?.agente_atendente_ativo ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-[#252830]">
              <p className="text-xs text-gray-500 mb-1">WhatsApp configurado</p>
              {agenteConfig?.whatsapp_atendente ? (
                <p className="text-sm text-white">{agenteConfig.whatsapp_atendente}</p>
              ) : (
                <p className="text-sm text-yellow-500">Número não configurado — adicione nas configurações da loja</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e8391a]">hourglass_empty</span>
              Fila Pendente
              <span className="text-xs bg-[#e8391a]/20 text-[#e8391a] px-2 py-0.5 rounded-full">{filaPendente.length}</span>
            </h2>
            {filaPendente.length === 0 ? (
              <div className="text-center py-10 opacity-40 bg-[#16181f] rounded-xl border border-[#252830]">
                <span className="material-symbols-outlined text-5xl text-white">inbox</span>
                <p className="mt-2 font-bold text-white">Nenhum pedido aguardando atendimento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filaPendente.map((pedido) => (
                  <div key={pedido.id} className="p-4 rounded-xl border bg-[#16181f] border-[#252830] hover:border-[#e8391a]/30">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-bold uppercase text-gray-500">#{String(pedido.numero).padStart(4, '0')}</span>
                        <h3 className="font-bold text-white truncate">{pedido.cliente_nome}</h3>
                      </div>
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-400">Novo</span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-emerald-400 font-bold">R$ {Number(pedido.total).toFixed(2)}</span>
                      <span className="text-xs text-gray-500">{new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gestor' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e8391a]">analytics</span>
              Análise do Consultant
            </h2>

            {analiseLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#16181f] p-6 rounded-xl animate-pulse border border-[#252830]">
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
                <button onClick={() => refetchAnalise()} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm">Tentar novamente</button>
              </div>
            )}

            {analiseData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-r-xl border-l-4 border-l-emerald-500 bg-emerald-500/5">
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-emerald-400">
                    <span>✅</span> Pontos Positivos
                  </h3>
                  <ul className="space-y-2">
                    {analiseData.positivos.map((item, i) => (
                      <li key={i} className="text-sm text-white flex gap-2"><span className="text-emerald-400">•</span> {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-r-xl border-l-4 border-l-yellow-500 bg-yellow-500/5">
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-yellow-400">
                    <span>⚠️</span> Pontos de Atenção
                  </h3>
                  <ul className="space-y-2">
                    {analiseData.atencao.map((item, i) => (
                      <li key={i} className="text-sm text-white flex gap-2"><span className="text-yellow-400">•</span> {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-r-xl border-l-4 border-l-[#f57c24] bg-[#f57c24]/5">
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-[#f57c24]">
                    <span>🎯</span> Sugestões de Ação
                  </h3>
                  <div className="space-y-3">
                    {sugestoesLocais.map((sugestao, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-[#16181f] border-[#252830]">
                        <p className="font-bold text-white text-sm">{sugestao.titulo}</p>
                        <p className="text-xs text-gray-500 mt-1">{sugestao.descricao}</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => executarAcao(sugestao)} disabled={executando} className="flex-1 py-1.5 bg-[#e8391a] text-white rounded-lg text-xs font-bold hover:bg-[#e8391a]/90 transition-colors">Executar</button>
                          <button onClick={() => ignorarAcao(sugestao.titulo)} className="flex-1 py-1.5 border border-[#252830] text-gray-400 rounded-lg text-xs font-bold hover:bg-[#252830] transition-colors">Ignorar</button>
                        </div>
                      </div>
                    ))}
                    {sugestoesLocais.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhuma sugestão no momento</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e8391a]">chat</span>
              Chat Livre
            </h2>
            <div className="rounded-xl border bg-[#16181f] border-[#252830] max-h-[400px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[300px]">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'agent' && (
                      <div className="w-8 h-8 rounded-full bg-[#252830] flex items-center justify-center mr-2 shrink-0">
                        <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                      </div>
                    )}
                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[#e8391a] text-white rounded-br-sm' : 'bg-[#252830] text-white rounded-bl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-[#252830] flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
                  placeholder="Digite sua mensagem..."
                  disabled={chatLoading}
                  className="flex-1 rounded-xl p-3 text-sm text-white border border-[#252830] bg-[#0d0e12] resize-none h-12"
                />
                <button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()} className="px-4 bg-[#e8391a] text-white rounded-xl font-bold text-sm hover:bg-[#e8391a]/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]">
                  {chatLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enviar'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e8391a]">description</span>
              Relatórios Diários
            </h2>
            {relatoriosData && relatoriosData.length > 0 ? (
              <div className="space-y-2">
                {relatoriosData.map((rel) => (
                  <div key={rel.id} className="p-4 rounded-xl flex justify-between items-center border bg-[#16181f]/30 border-[#252830]">
                    <div>
                      <p className="font-bold text-white">{format(parseISO(rel.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${rel.status === 'enviado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {rel.status === 'enviado' ? 'Enviado' : 'Falhou'}
                      </span>
                    </div>
                    <button onClick={() => reenviarRelatorio(rel.data)} disabled={reenviando} className="px-4 py-2 text-gray-400 rounded-lg text-sm font-bold hover:bg-[#252830] transition-colors border border-[#252830]">
                      {reenviando ? 'Enviando...' : 'Reenviar'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 rounded-xl bg-[#16181f]/30 border border-[#252830]">
                <span className="material-symbols-outlined text-4xl text-gray-700">description</span>
                <p className="mt-2 text-sm text-gray-500">Nenhum relatório enviado ainda. O primeiro será enviado hoje às 23h.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
