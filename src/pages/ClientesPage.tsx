import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Endereco {
  cep: string
  rua: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  principal: boolean
}

interface Cliente {
  id: string
  nome: string
  telefone: string
  email?: string
  data_nascimento?: string
  enderecos: Endereco[]
  perfil: 'novo' | 'recorrente' | 'vip'
  total_pedidos: number
  total_gasto: number
  cashback: number
  pontos: number
  primeiro_pedido?: string
  ultimo_pedido?: string
  observacoes?: string
  created_at: string
}

interface Cupom {
  id: string
  codigo: string
  tipo: 'percentual' | 'fixo'
  valor: number
  usos_realizados: number
  usos_maximos?: number
  validade?: string
  ativo: boolean
  created_at: string
}

export default function ClientesPage() {
  const [activeTab, setActiveTab] = useState<'gestao' | 'fidelidade' | 'cupons'>('gestao')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPerfil, setFilterPerfil] = useState<string>('todos')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Partial<Cliente> | null>(null)
  const [config, setConfig] = useState<any>(null)
  const [cupons, setCupons] = useState<Cupom[]>([])

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })
    
    if (error) console.error('Erro ao buscar clientes:', error)
    else {
      const updated = data?.map(c => {
        let perfil = c.perfil
        if (c.total_pedidos >= 10 || c.total_gasto >= 500) perfil = 'vip'
        else if (c.total_pedidos >= 3) perfil = 'recorrente'
        else perfil = 'novo'
        return { ...c, perfil }
      })
      setClientes(updated || [])
    }
    setLoading(false)
  }, [])

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from('configuracoes').select('*').limit(1).single()
    setConfig(data)
  }, [])

  const fetchCupons = useCallback(async () => {
    const { data } = await supabase.from('cupons').select('*').order('created_at', { ascending: false })
    setCupons(data || [])
  }, [])

  useEffect(() => {
    fetchClientes()
    fetchConfig()
    fetchCupons()
  }, [fetchClientes, fetchConfig, fetchCupons])

  useRealtime('clientes', fetchClientes)
  useRealtime('cupons', fetchCupons)
  useRealtime('configuracoes', fetchConfig)

  const filteredClientes = clientes.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.telefone.includes(searchTerm)
    const matchesFilter = filterPerfil === 'todos' || c.perfil === filterPerfil
    return matchesSearch && matchesFilter
  })

  const kpis = {
    total: clientes.length,
    vip: clientes.filter(c => c.perfil === 'vip').length,
    recorrentes: clientes.filter(c => c.perfil === 'recorrente').length,
    novos: clientes.filter(c => c.perfil === 'novo').length,
  }

  const handleOpenDrawer = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setIsDrawerOpen(true)
  }

  const handleNewCliente = () => {
    setEditingCliente({ nome: '', telefone: '', email: '', enderecos: [], perfil: 'novo' })
    setIsModalOpen(true)
  }

  return (
    <div className="animate-fade-in pb-10 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8">
        <div>
          <span className="text-[#f57c24] font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">CRM & Fidelidade</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">Clientes</h2>
        </div>
        
        <div className="flex bg-[#16181f] rounded-2xl p-1 border border-[#252830] overflow-x-auto">
          {[
            { id: 'gestao', label: 'Gestão', icon: 'group' },
            { id: 'fidelidade', label: 'Fidelidade', icon: 'stars' },
            { id: 'cupons', label: 'Cupons', icon: 'local_offer' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                ? 'bg-[#e8391a] text-white shadow-lg' 
                : 'text-white/60 hover:text-white hover:bg-[#252830]'
              }`}
            >
              <span className="material-symbols-outlined text-base sm:text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'gestao' && (
          <button 
            onClick={handleNewCliente}
            className="bg-[#e8391a] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#c72f15] transition-all shadow-lg"
          >
            <span className="material-symbols-outlined">person_add</span>
            Novo Cliente
          </button>
        )}
      </div>

      {activeTab === 'gestao' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total de Clientes', value: kpis.total, icon: 'group', gradient: 'from-[#e8391a]/20 to-[#e8391a]/5', border: 'border-[#e8391a]/30', text: 'text-[#e8391a]' },
              { label: 'Clientes VIP', value: kpis.vip, icon: 'stars', gradient: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/30', text: 'text-yellow-400' },
              { label: 'Recorrentes', value: kpis.recorrentes, icon: 'cached', gradient: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-400' },
              { label: 'Novos (Total)', value: kpis.novos, icon: 'person_add', gradient: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400' },
            ].map((kpi, i) => (
              <div key={i} className={`bg-gradient-to-br ${kpi.gradient} rounded-2xl p-6 border ${kpi.border}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`material-symbols-outlined ${kpi.text}`}>{kpi.icon}</span>
                  <span className="text-2xl font-bold text-white">{kpi.value}</span>
                </div>
                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{kpi.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#16181f] rounded-2xl p-4 border border-[#252830] mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-white/40 focus:border-[#e8391a] outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              {['todos', 'novo', 'recorrente', 'vip'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPerfil(p)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    filterPerfil === p 
                    ? 'bg-[#e8391a]/20 border-[#e8391a]/30 text-[#e8391a]' 
                    : 'border-[#252830] text-white/60 hover:bg-[#252830] hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#16181f] rounded-3xl border border-[#252830] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#252830] bg-[#0c0e15]/50">
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50 text-center">Cliente</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50 text-center">Perfil</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50 text-center">Pedidos</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50 text-center">Gasto</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50 text-center">Último Pedido</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-white/50 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252830]/50">
                  {loading ? (
                    <tr><td colSpan={6} className="p-20"><div className="w-8 h-8 border-4 border-[#e8391a] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                  ) : filteredClientes.length === 0 ? (
                    <tr><td colSpan={6} className="p-20 text-white/40 italic text-center">Nenhum cliente encontrado.</td></tr>
                  ) : filteredClientes.map(cliente => (
                    <tr key={cliente.id} className="group hover:bg-[#e8391a]/5 cursor-pointer" onClick={() => handleOpenDrawer(cliente)}>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-[#252830] flex items-center justify-center font-bold text-[#e8391a]">{cliente.nome[0]}</div>
                           <div className="text-left">
                              <div className="font-bold text-sm text-white">{cliente.nome}</div>
                              <div className="text-[10px] text-white/40">{cliente.telefone}</div>
                           </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getPerfilBadge(cliente.perfil)}`}>
                          {cliente.perfil}
                        </span>
                      </td>
                      <td className="p-6 font-medium text-white">{cliente.total_pedidos}</td>
                      <td className="p-6 font-bold text-emerald-400">R$ {cliente.total_gasto?.toFixed(2) || '0.00'}</td>
                      <td className="p-6 text-xs text-white/40">{cliente.ultimo_pedido ? format(new Date(cliente.ultimo_pedido), "dd/MM/yy") : '---'}</td>
                      <td className="p-6">
                        <button className="p-2 hover:bg-[#e8391a]/10 text-[#e8391a] rounded-lg transition-all"><span className="material-symbols-outlined text-xl">visibility</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'fidelidade' && <FidelidadeContent config={config} onUpdate={fetchConfig} />}
      {activeTab === 'cupons' && <CuponsContent cupons={cupons} onUpdate={fetchCupons} />}

      {isDrawerOpen && selectedCliente && <ClienteDrawer cliente={selectedCliente} onClose={() => setIsDrawerOpen(false)} onUpdate={fetchClientes} />}
      {isModalOpen && <ClienteModal cliente={editingCliente} onClose={() => setIsModalOpen(false)} onSave={fetchClientes} />}
    </div>
  )
}

function getPerfilBadge(perfil: string) {
  switch (perfil) {
    case 'vip': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'recorrente': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }
}

function FidelidadeContent({ config, onUpdate }: any) {
  const [localConfig, setLocalConfig] = useState(config)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { id, ...rest } = localConfig
    await supabase.from('configuracoes').update(rest).eq('id', id)
    onUpdate()
    setSaving(false)
  }

  if (!config) return <div className="p-20 text-center animate-pulse text-white/40">Carregando configurações...</div>

  return (
    <div className="bg-[#16181f] rounded-3xl p-8 border border-[#252830] max-w-4xl mx-auto animate-fade-in shadow-xl">
       <div className="flex items-center justify-between mb-8 pb-8 border-b border-[#252830]">
          <div>
             <h3 className="text-2xl font-bold text-white">Programa de Fidelidade</h3>
             <p className="text-white/40 text-sm">Configure como seus clientes ganham e usam pontos.</p>
          </div>
          <button 
            type="button"
            onClick={() => setLocalConfig({...localConfig, fidelidade_ativa: !localConfig.fidelidade_ativa})}
            className={`w-14 h-8 rounded-full transition-all relative ${localConfig.fidelidade_ativa ? 'bg-[#e8391a]' : 'bg-[#252830]'}`}
          >
             <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${localConfig.fidelidade_ativa ? 'left-7' : 'left-1'}`} />
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-6">
             <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50 ml-1">Pontos por Real Gasto</span>
                <input type="number" value={localConfig.pontos_por_real || ''} onChange={e => setLocalConfig({...localConfig, pontos_por_real: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-2 outline-none focus:border-[#e8391a] text-white"/>
                <p className="text-[10px] text-white/40 mt-1 ml-1">Padrão: 1 ponto por R$ 1,00</p>
             </label>
             <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50 ml-1">Valor de cada ponto (R$)</span>
                <input type="number" step="0.01" value={localConfig.valor_ponto_reais || ''} onChange={e => setLocalConfig({...localConfig, valor_ponto_reais: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-2 outline-none focus:border-[#e8391a] text-white"/>
                <p className="text-[10px] text-white/40 mt-1 ml-1">Ex: 100 pontos = R$ 10,00 (se 0,10)</p>
             </label>
          </div>
          <div className="space-y-6">
             <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50 ml-1">Mínimo para Resgate</span>
                <input type="number" value={localConfig.pontos_minimos_resgate || ''} onChange={e => setLocalConfig({...localConfig, pontos_minimos_resgate: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-2 outline-none focus:border-[#e8391a] text-white"/>
             </label>
             <div className="flex items-center justify-between p-4 bg-[#0c0e15] rounded-xl border border-[#e8391a]/20">
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-white">Cashback Automático</span>
                   <span className="text-[10px] text-white/40">Converte pontos em saldo instantâneo</span>
                </div>
                <input type="checkbox" checked={localConfig.cashback_automatico || false} onChange={e => setLocalConfig({...localConfig, cashback_automatico: e.target.checked})} className="accent-[#e8391a] w-5 h-5 cursor-pointer"/>
             </div>
          </div>
       </div>

       <div className="border-t border-[#252830] pt-8 mb-8">
          <h4 className="font-bold mb-4 flex items-center gap-2 text-white"><span className="material-symbols-outlined text-[#e8391a]">cake</span> Cupom de Aniversário Automático</h4>
          <textarea 
            value={localConfig.mensagem_aniversario || ''}
            onChange={e => setLocalConfig({...localConfig, mensagem_aniversario: e.target.value})}
            className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl p-4 text-sm h-24 italic outline-none focus:border-[#e8391a] text-white placeholder-white/40"
            placeholder="Mensagem via WhatsApp..."
          />
          <p className="text-[10px] text-white/40 mt-2 italic px-1">Este texto será usado como base para o envio automático via Twilio.</p>
       </div>

       <button 
         onClick={save} 
         disabled={saving}
         className="w-full bg-[#e8391a] text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-[#c72f15] transition-all active:scale-[0.98]"
       >
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Salvar Configurações de Fidelidade'}
       </button>
    </div>
  )
}

function CuponsContent({ cupons, onUpdate }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCupom, setEditingCupom] = useState<any>(null)

  const handleNew = () => {
    setEditingCupom({ codigo: '', tipo: 'percentual', valor: 0, ativo: true })
    setIsModalOpen(true)
  }

  const toggleAtivo = async (cupom: Cupom) => {
    await supabase.from('cupons').update({ ativo: !cupom.ativo }).eq('id', cupom.id)
    onUpdate()
  }

  return (
    <div className="animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <div>
             <h3 className="text-xl font-bold text-white">Cupons de Desconto</h3>
             <p className="text-white/40 text-sm">Crie e gerencie promoções para fidelizar clientes.</p>
          </div>
          <button onClick={handleNew} className="bg-[#e8391a] text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#c72f15] shadow-lg transition-all">
             <span className="material-symbols-outlined">add</span> Novo Cupom
          </button>
       </div>

       <div className="bg-[#16181f] rounded-3xl border border-[#252830] overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-center">
             <thead>
                <tr className="bg-[#0c0e15]/50 border-b border-[#252830]">
                   <th className="p-5 text-[10px] font-bold uppercase text-white/50">Código</th>
                   <th className="p-5 text-[10px] font-bold uppercase text-white/50">Desconto</th>
                   <th className="p-5 text-[10px] font-bold uppercase text-white/50">Usos Realizados</th>
                   <th className="p-5 text-[10px] font-bold uppercase text-white/50">Validade</th>
                   <th className="p-5 text-[10px] font-bold uppercase text-white/50">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-[#252830]/50">
                {cupons.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-white/40 italic">Nenhum cupom cadastrado.</td></tr>
                ) : cupons.map((c: any) => (
                   <tr key={c.id} className="hover:bg-[#e8391a]/5 transition-colors">
                      <td className="p-5 font-black text-[#e8391a] font-mono tracking-widest text-lg">{c.codigo}</td>
                      <td className="p-5 font-bold text-sm text-white">{c.tipo === 'percentual' ? `${c.valor}%` : `R$ ${c.valor.toFixed(2)}`}</td>
                      <td className="p-5 text-sm font-medium text-white">{c.usos_realizados} <span className="text-white/40 font-normal">/ {c.usos_maximos || '∞'}</span></td>
                      <td className="p-5 text-xs font-semibold text-white/40">{c.validade ? format(new Date(c.validade), 'dd MMM yyyy', { locale: ptBR }) : '---'}</td>
                      <td className="p-5">
                         <button 
                            type="button"
                            onClick={() => toggleAtivo(c)} 
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all ${c.ativo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                         >
                            {c.ativo ? 'Ativo' : 'Inativo'}
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>

       {isModalOpen && <CupomModal cupom={editingCupom} onClose={() => setIsModalOpen(false)} onSave={onUpdate} />}
    </div>
  )
}

function CupomModal({ cupom, onClose, onSave }: any) {
  const [formData, setFormData] = useState(cupom)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!formData.codigo || formData.valor <= 0) return alert('Preecha código e valor!')
    setSaving(true)
    if (formData.id) await supabase.from('cupons').update(formData).eq('id', formData.id)
    else await supabase.from('cupons').insert([formData])
    onSave()
    onClose()
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
       <div className="bg-[#16181f] rounded-3xl w-full max-w-md overflow-hidden border border-[#252830] shadow-2xl relative animate-scale-in">
          <div className="p-6 bg-[#0c0e15] border-b border-[#252830] flex justify-between items-center">
             <h4 className="font-bold uppercase tracking-widest text-[10px] text-[#e8391a]">Novo Cupom de Desconto</h4>
             <button onClick={onClose} className="p-1 hover:bg-[#252830] rounded-full text-white/60"><span className="material-symbols-outlined text-sm">close</span></button>
          </div>
          <div className="p-8 space-y-6">
             <label className="block">
                <span className="text-[10px] font-bold uppercase text-white/50 ml-1">Código Promocional</span>
                <input type="text" placeholder="EX: KERO10" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-1 font-mono font-black text-xl tracking-widest text-[#e8391a] outline-none focus:border-[#e8391a]"/>
             </label>
             <div className="grid grid-cols-2 gap-4">
                <label>
                   <span className="text-[10px] font-bold uppercase text-white/50 ml-1">Tipo de Desconto</span>
                   <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-1 text-sm text-white outline-none">
                      <option value="percentual">Porcentagem (%)</option>
                      <option value="fixo">Valor Fixo (R$)</option>
                   </select>
                </label>
                <label>
                   <span className="text-[10px] font-bold uppercase text-white/50 ml-1">Valor do Desconto</span>
                   <input type="number" step="0.01" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: Number(e.target.value)})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-1 text-sm font-bold text-white outline-none"/>
                </label>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <label>
                   <span className="text-[10px] font-bold uppercase text-white/50 ml-1">Limite total de usos</span>
                   <input type="number" placeholder="Vazio = ilimitado" value={formData.usos_maximos || ''} onChange={e => setFormData({...formData, usos_maximos: e.target.value ? Number(e.target.value) : null})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-1 text-sm text-white outline-none"/>
                </label>
                <label>
                   <span className="text-[10px] font-bold uppercase text-white/50 ml-1">Data de Validade</span>
                   <input type="date" value={formData.validade || ''} onChange={e => setFormData({...formData, validade: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-xl py-4 px-4 mt-1 text-sm text-white outline-none"/>
                </label>
             </div>
          </div>
          <div className="p-8 bg-[#0c0e15] flex justify-end gap-4">
             <button onClick={onClose} className="px-6 py-4 text-xs font-bold uppercase text-white/60 hover:text-white">Cancelar</button>
             <button onClick={save} disabled={saving} className="bg-[#e8391a] text-white px-10 py-4 rounded-xl text-xs font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                {saving ? 'Registrando...' : 'Criar Promoção'}
             </button>
          </div>
       </div>
    </div>
  )
}

function ClienteDrawer({ cliente, onClose, onUpdate }: any) {
  const [obs, setObs] = useState(cliente.observacoes || '')
  const [isUpdating, setIsUpdating] = useState(false)
  
  const saveObs = async () => {
     setIsUpdating(true)
     await supabase.from('clientes').update({ observacoes: obs }).eq('id', cliente.id)
     onUpdate()
     setIsUpdating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#16181f] h-full shadow-2xl animate-slide-in-right overflow-y-auto no-scrollbar border-l border-[#252830]">
        <div className="p-10">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-bold text-white tracking-tight">Perfil do Cliente</h3>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-[#252830] rounded-full transition-all text-white/60">
                 <span className="material-symbols-outlined">close</span>
              </button>
           </div>
           
           <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-[#e8391a] to-[#ff6b4a] flex items-center justify-center text-5xl font-black text-white shadow-2xl mb-6 ring-8 ring-[#e8391a]/5">
                {cliente.nome[0]}
              </div>
              <h4 className="text-2xl font-bold text-white mb-1">{cliente.nome}</h4>
              <p className="text-white/40 text-sm font-medium mb-4">{cliente.telefone}</p>
              <div className="flex flex-wrap justify-center gap-2">
                 <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPerfilBadge(cliente.perfil)}`}>
                    {cliente.perfil}
                 </span>
                 {cliente.perfil === 'vip' && cliente.ultimo_pedido && (new Date().getTime() - new Date(cliente.ultimo_pedido).getTime()) > 30*24*60*60*1000 && (
                    <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500 text-white shadow-lg flex items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-[10px]">report</span> Inativo 30d
                    </span>
                 )}
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-[#0c0e15] p-6 rounded-3xl border border-[#252830] text-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-150 transition-all">
                    <span className="material-symbols-outlined text-4xl text-[#e8391a]">stars</span>
                 </div>
                 <span className="text-[10px] text-white/40 uppercase font-bold block mb-1">Pontos Fidelidade</span>
                 <span className="text-3xl font-black text-[#e8391a]">{cliente.pontos}</span>
              </div>
              <div className="bg-[#0c0e15] p-6 rounded-3xl border border-[#252830] text-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-150 transition-all">
                    <span className="material-symbols-outlined text-4xl text-emerald-500">payments</span>
                 </div>
                 <span className="text-[10px] text-white/40 uppercase font-bold block mb-1">Saldo Cashback</span>
                 <span className="text-3xl font-black text-emerald-400">R$ {cliente.cashback.toFixed(2)}</span>
              </div>
           </div>

           <div className="space-y-6 mb-10">
              <div className="bg-[#0c0e15] p-8 rounded-[2rem] border border-[#252830] relative">
                 <h5 className="font-black text-[10px] text-[#e8391a] uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">analytics</span> Estatísticas de Compra
                 </h5>
                 <div className="grid grid-cols-1 gap-5">
                    <div className="flex justify-between items-center text-sm border-b border-[#252830]/50 pb-3">
                       <span className="text-white/40 font-medium">Frequência Total:</span>
                       <span className="font-black text-lg text-white">{cliente.total_pedidos} <span className="text-[10px] font-normal text-white/40">pedidos</span></span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-[#252830]/50 pb-3">
                       <span className="text-white/40 font-medium">Investimento Total:</span>
                       <span className="font-black text-lg text-emerald-400">R$ {cliente.total_gasto?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-white/40 font-medium">Ticket Médio:</span>
                       <span className="font-black text-lg text-white">R$ {cliente.total_pedidos > 0 ? (cliente.total_gasto / cliente.total_pedidos).toFixed(2) : '0,00'}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-[#0c0e15] p-8 rounded-[2rem] border border-[#252830]">
                 <h5 className="font-black text-[10px] text-[#e8391a] uppercase tracking-widest mb-6 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-lg">sticky_note_2</span> Notas do Estabelecimento
                    </div>
                    {isUpdating && <div className="w-3 h-3 border-2 border-[#e8391a] border-t-transparent rounded-full animate-spin" />}
                 </h5>
                 <textarea 
                   value={obs}
                   onChange={e => setObs(e.target.value)}
                   onBlur={saveObs}
                   className="w-full bg-[#16181f] border-none rounded-2xl p-5 text-xs h-32 italic outline-none focus:ring-1 focus:ring-[#e8391a]/20 transition-all text-white/70 leading-loose"
                   placeholder="Adicione observações internas sobre este cliente..."
                 />
              </div>

              <div className="bg-[#0c0e15] p-8 rounded-[2rem] border border-[#252830]">
                 <h5 className="font-black text-[10px] text-[#e8391a] uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">location_on</span> Endereços Salvos
                 </h5>
                 <div className="space-y-3">
                    {cliente.enderecos && cliente.enderecos.length > 0 ? cliente.enderecos.map((end: any, i: number) => (
                       <div key={i} className={`p-4 rounded-2xl text-xs flex gap-3 ${end.principal ? 'bg-[#e8391a]/5 border border-[#e8391a]/20' : 'bg-[#16181f] border border-[#252830]'}`}>
                          <span className={`material-symbols-outlined ${end.principal ? 'text-[#e8391a]' : 'text-white/40'}`}>{end.principal ? 'home' : 'location_on'}</span>
                          <div>
                             <div className="font-bold text-white">{end.rua}, {end.numero}</div>
                             <div className="text-[10px] text-white/40">{end.bairro} - {end.cidade}/{end.estado}</div>
                          </div>
                       </div>
                    )) : <p className="text-xs text-white/40 italic">Nenhum endereço cadastrado.</p>}
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.open(`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`, '_blank')}
                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-xl active:scale-[0.98] transition-all"
              >
                 <span className="material-symbols-outlined text-xl">chat</span> ENVIAR CUPOM VIA WHATSAPP
              </button>
              <div className="grid grid-cols-2 gap-3">
                 <button className="bg-[#252830] text-white py-5 rounded-2xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 border border-[#252830] active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-lg">add_circle</span> Adicionar Pontos
                 </button>
                 <button className="bg-[#252830] text-red-400 py-5 rounded-2xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 border border-[#252830] active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-lg">block</span> Banir Cliente
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

function ClienteModal({ cliente, onClose, onSave }: any) {
  const [formData, setFormData] = useState(cliente)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!formData.nome || !formData.telefone) return alert('Nome e telefone são obrigatórios!')
    setSaving(true)
    const { id, ...data } = formData
    let result;
    if (id) result = await supabase.from('clientes').update(data).eq('id', id)
    else result = await supabase.from('clientes').insert([data])
    
    if (result.error) alert('Erro ao salvar!')
    else { onSave(); onClose(); }
    setSaving(false)
  }

  const buscarCep = async (cep: string) => {
    if (cep.length === 8) {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await resp.json()
      if (!data.erro) {
         const newEnd = {
           cep, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf, principal: true, numero: ''
         }
         setFormData({
           ...formData,
           enderecos: [newEnd]
         })
       }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-lg animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#16181f] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#252830] animate-scale-in">
        <div className="bg-[#0c0e15] p-10 flex items-center justify-between border-b border-[#252830]">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e8391a]/10 flex items-center justify-center text-[#e8391a]">
                 <span className="material-symbols-outlined text-3xl font-bold">person_add</span>
              </div>
              <div>
                 <h3 className="text-3xl font-bold text-white">{formData.id ? 'Editar Cadastro' : 'Novo Cliente'}</h3>
                 <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Informações básicas e endereço</p>
              </div>
           </div>
           <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-[#252830] rounded-full transition-all text-white/60"><span className="material-symbols-outlined">close</span></button>
        </div>
        
        <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="block group">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">Nome Completo</span>
                 <input type="text" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all"/>
              </label>
              <label className="block group">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">Telefone / WhatsApp</span>
                 <input type="text" placeholder="(00) 00000-0000" value={formData.telefone || ''} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all font-mono"/>
              </label>
              <label className="block group">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">E-mail (Opcional)</span>
                 <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all"/>
              </label>
              <label className="block group">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 ml-2 group-focus-within:text-[#e8391a] transition-colors">Data de Nascimento</span>
                 <input type="date" value={formData.data_nascimento || ''} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-6 mt-1.5 text-sm text-white outline-none focus:border-[#e8391a] transition-all"/>
              </label>
           </div>

           <div className="pt-8 border-t border-[#252830]">
              <h5 className="font-black text-[10px] text-[#e8391a] uppercase tracking-widest mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-lg">map</span> Endereço Principal (ViaCEP)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <label className="md:col-span-1">
                   <span className="text-[10px] font-bold uppercase text-white/50 ml-1">CEP</span>
                   <input 
                     type="text" 
                     className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-4 mt-1.5 text-sm outline-none focus:border-[#e8391a] font-bold text-white"
                     onBlur={e => buscarCep(e.target.value.replace(/\D/g, ''))}
                   />
                 </label>
                 <label className="md:col-span-2">
                   <span className="text-[10px] font-bold uppercase text-white/50 ml-1">Logradouro</span>
                   <input type="text" value={formData.enderecos?.[0]?.rua || ''} onChange={e => {
                      const ends = [...(formData.enderecos || [])];
                      if (ends[0]) ends[0].rua = e.target.value;
                      setFormData({...formData, enderecos: ends});
                   }} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-4 mt-1.5 text-sm outline-none focus:border-[#e8391a] font-medium text-white"/>
                 </label>
                 <label className="md:col-span-1">
                   <span className="text-[10px] font-bold uppercase text-white/50 ml-1">Número</span>
                   <input type="text" value={formData.enderecos?.[0]?.numero || ''} onChange={e => {
                      const ends = [...(formData.enderecos || [])];
                      if (ends[0]) ends[0].numero = e.target.value;
                      setFormData({...formData, enderecos: ends});
                   }} className="w-full bg-[#0c0e15] border border-[#252830] rounded-2xl py-4 px-4 mt-1.5 text-sm outline-none focus:border-[#e8391a] font-bold text-white"/>
                 </label>
              </div>
           </div>
        </div>
        
        <div className="p-10 bg-[#0c0e15] border-t border-[#252830] flex justify-end gap-5">
           <button onClick={onClose} className="px-8 py-4 font-black text-xs uppercase text-white/60 hover:text-white transition-colors">Cancelar</button>
           <button 
             onClick={handleSave} 
             disabled={saving} 
             className="bg-[#e8391a] text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-2xl hover:bg-[#c72f15] active:scale-[0.98] transition-all flex items-center gap-3"
           >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'CONCLUIR CADASTRO'}
           </button>
        </div>
      </div>
    </div>
  )
}
