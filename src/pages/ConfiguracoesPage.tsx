import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../hooks/useRealtime'

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
    <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1 block">{label}</label>
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all" />
  </div>
)

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-all">
    <span className="text-sm font-bold">{label}</span>
    <div className={`w-12 h-7 rounded-full transition-all relative ${checked ? 'bg-primary-container' : 'bg-surface-container-highest'}`} onClick={() => onChange(!checked)}>
      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  </label>
)

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

  if (!config) return (<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-container border-t-transparent rounded-full animate-spin" /></div>)

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-secondary font-bold uppercase tracking-[0.3em] text-[10px] mb-2 block">Sistema</span>
          <h2 className="text-5xl font-[Outfit] font-bold text-on-background tracking-tighter">Configurações</h2>
        </div>
        <button onClick={save} disabled={saving} className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary-container text-on-primary-fixed'} disabled:opacity-50`}>
          {saving ? <div className="w-4 h-4 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin" /> : saved ? '✓ Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* Seção: Dados da Loja */}
      <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">store</span> Dados da Loja
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

      {/* Seção: Funcionamento */}
      <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">schedule</span> Funcionamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <InputField label="Horário Abertura" value={config.horario_abertura} onChange={v => update('horario_abertura', v)} type="time" />
          <InputField label="Horário Fechamento" value={config.horario_fechamento} onChange={v => update('horario_fechamento', v)} type="time" />
        </div>
        <Toggle label="Loja Aberta" checked={config.loja_aberta} onChange={v => update('loja_aberta', v)} />
      </div>

      {/* Seção: Delivery */}
      <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">local_shipping</span> Delivery
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Taxa de Entrega (R$)" value={config.taxa_entrega} onChange={v => update('taxa_entrega', Number(v))} type="number" />
          <InputField label="Pedido Mínimo (R$)" value={config.pedido_minimo} onChange={v => update('pedido_minimo', Number(v))} type="number" />
          <InputField label="Raio de Entrega (KM)" value={config.raio_entrega_km} onChange={v => update('raio_entrega_km', Number(v))} type="number" />
        </div>
      </div>

      {/* Seção: Pagamentos */}
      <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">payments</span> Formas de Pagamento
        </h3>
        <div className="space-y-3">
          <Toggle label="Aceita PIX" checked={config.aceita_pix} onChange={v => update('aceita_pix', v)} />
          <Toggle label="Aceita Cartão" checked={config.aceita_cartao} onChange={v => update('aceita_cartao', v)} />
          <Toggle label="Aceita Dinheiro" checked={config.aceita_dinheiro} onChange={v => update('aceita_dinheiro', v)} />
        </div>
      </div>

      {/* Seção: Mesas */}
      <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 mt-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">table_restaurant</span> Mesas
        </h3>
        <div className="space-y-4">
          <Toggle label="Módulo de Mesas Ativado" checked={config.modulo_mesas_ativado ?? true} onChange={v => update('modulo_mesas_ativado', v)} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Número Total de Mesas" value={config.total_mesas ?? 10} onChange={v => update('total_mesas', Number(v))} type="number" />
            <InputField label="Capacidade por Mesa" value={config.capacidade_mesa ?? 4} onChange={v => update('capacidade_mesa', Number(v))} type="number" />
          </div>
        </div>
      </div>
    </div>
  )
}
