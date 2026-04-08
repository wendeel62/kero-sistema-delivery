import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../contexts/AuthContext'

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
  const [config, setConfig] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

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
        <button onClick={save} disabled={saving} className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-[#e8391a] text-white'} disabled:opacity-50`}>
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : saved ? '✓ Salvo!' : 'Salvar'}
        </button>
      </div>

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
        </div>
      </div>

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

      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-[#e8391a]">payments</span> Formas de Pagamento
        </h3>
        <div className="space-y-3">
          <Toggle label="Aceita PIX" checked={config.aceita_pix} onChange={v => update('aceita_pix', v)} />
          <Toggle label="Aceita Cartão" checked={config.aceita_cartao} onChange={v => update('aceita_cartao', v)} />
          <Toggle label="Aceita Dinheiro" checked={config.aceita_dinheiro} onChange={v => update('aceita_dinheiro', v)} />
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830]">
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

      {toast && (
        <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
