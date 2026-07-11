import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@hooks/useRealtime'
import { useAuth } from '@contexts/AuthContext'
import { useTenantId } from '@hooks/useTenantId'
import { usePrinter } from '@hooks/usePrinter'
import { useThermalPrinter } from '@hooks/useThermalPrinter'
import { ConfigInputField } from '@components/ConfigInputField'
import { ConfigToggle } from '@components/ConfigToggle'
import type { OrderData } from '../services/printService'


const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with -
    .replace(/^-+|-+$/g, '') // Remove leading/trailing -
}

interface Config {
  id: string
  tenant_id: string
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
  meta_pixel_id?: string
  ga4_measurement_id?: string
  utmfy_token?: string
  impressao_automatica?: boolean
  largura_papel?: 58 | 80
  cor_primaria?: string
  total_mesas?: number
  capacidade_mesa?: number
  modulo_mesas_ativado?: boolean
  slug?: string
  logo_url?: string
}

// Components moved to src/components/ConfigInputField.tsx and ConfigToggle.tsx

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const tenantId = useTenantId()
  const printer = usePrinter()
  const usbPrinter = useThermalPrinter()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('configuracoes').select('*').eq('tenant_id', tenantId).single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Nenhuma configuração encontrada ou acesso negado por RLS.')
          setConfig(null)
        } else {
          console.error('Erro ao buscar configurações:', error)
          showToast('Erro ao carregar dados.')
        }
      } else if (data) {
        setConfig(data)
      }
    } catch (err) {
      console.error('Falha catastrófica ao buscar config:', err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])
  useRealtime({
    configs: [
      { table: 'configuracoes', filter: `tenant_id=eq.${tenantId}`, callback: fetchConfig }
    ]
  })

  const update = (key: keyof Config, value: unknown) => {
    if (config) {
      const newConfig = { ...config, [key]: value }
      // Se o nome da loja mudar, atualiza o slug em tempo real para o preview
      if (key === 'nome_loja') {
        newConfig.slug = slugify(value as string)
      }
      setConfig(newConfig)
    }
  }

  const save = async () => {
    if (!config) return
    setSaving(true)
    
    // Garantir que o slug esteja preenchido antes de salvar
    const finalSlug = config.slug || slugify(config.nome_loja)
    const { id, ...rest } = config
    
    const { data, error } = await supabase
      .from('configuracoes')
      .update({ 
        ...rest, 
        slug: finalSlug, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()

    if (data) {
      setConfig(data)
      queryClient.invalidateQueries({ queryKey: ['configuracoes-loja', tenantId] })
    }
    if (error) showToast('Erro ao salvar: ' + error.message)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#e8391a] border-t-transparent rounded-full animate-spin" /></div>)

  if (!config) {
    return (
      <div className="animate-fade-in p-6 text-center">
        <h2 className="text-3xl font-[Outfit] font-bold text-white mb-4">Bem-vindo ao Kero!</h2>
        <p className="text-on-surface-variant mb-8">Parece que você ainda não configurou os dados da sua loja.</p>
        <button 
          onClick={async () => {
            setSaving(true)
            const { data, error } = await supabase.from('configuracoes').insert({
              nome_loja: 'Nova Loja',
              loja_aberta: false,
              taxa_entrega: 0,
              pedido_minimo: 0,
              tenant_id: user?.id
            }).select().single()
            if (data) setConfig(data)
            if (error) showToast('Erro ao criar configuração: ' + error.message)
            setSaving(false)
          }}
          disabled={saving}
          className="bg-[#e8391a] text-white px-8 py-3 rounded-xl font-bold"
        >
          {saving ? 'Criando...' : 'Configurar Minha Loja'}
        </button>
      </div>
    )
  }

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
          <ConfigInputField label="Nome da Loja" value={config.nome_loja} onChange={v => update('nome_loja', v)} />
          <ConfigInputField label="Telefone" value={config.telefone} onChange={v => update('telefone', v)} />
          <ConfigInputField label="CNPJ" value={config.cnpj} onChange={v => update('cnpj', v)} />
          <ConfigInputField label="CEP" value={config.cep} onChange={v => update('cep', v)} />
          <ConfigInputField label="Endereço" value={config.endereco} onChange={v => update('endereco', v)} />
          <ConfigInputField label="Cidade" value={config.cidade} onChange={v => update('cidade', v)} />
          <ConfigInputField label="Estado" value={config.estado} onChange={v => update('estado', v)} />
          <ConfigInputField label="Logo URL (Icone)" value={config.logo_url || ''} onChange={v => update('logo_url', v)} placeholder="https://exemplo.com/logo.png" />
          
          <div className="md:col-span-2 mt-4 p-4 bg-[#16181f] rounded-xl border border-dashed border-[#e8391a]/30">
            <label htmlFor="cardapio-link" className="text-xs font-bold text-[#e8391a] uppercase tracking-widest block mb-2">Link do seu Cardápio Online</label>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-sm">link</span>
              <code id="cardapio-link" className="text-emerald-400 text-sm font-mono break-all">
                {window.location.origin}/cardapio/{config.slug || (config.nome_loja ? slugify(config.nome_loja) : 'carregando...')}
              </code>
              <button 
                onClick={() => {
                  const finalSlug = config.slug || slugify(config.nome_loja)
                  navigator.clipboard.writeText(`${window.location.origin}/cardapio/${finalSlug}`)
                  showToast('Link copiado!')
                }}
                className="ml-auto p-2 bg-[#252830] hover:bg-[#2d313a] rounded-lg text-white transition-colors"
                title="Copiar link"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 font-medium italic">* O link atualiza automaticamente ao mudar o nome da loja.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-[#e8391a]">schedule</span> Funcionamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
<ConfigInputField label="Horário Abertura" value={config.horario_abertura} onChange={v => update('horario_abertura', v)} type="time" />
          <ConfigInputField label="Horário Fechamento" value={config.horario_fechamento} onChange={v => update('horario_fechamento', v)} type="time" />
        </div>
<ConfigToggle label="Loja Aberta" checked={config.loja_aberta} onChange={v => update('loja_aberta', v)} />
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-[#e8391a]">local_shipping</span> Delivery
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<ConfigInputField label="Taxa de Entrega (R$)" value={config.taxa_entrega} onChange={v => update('taxa_entrega', Number(v))} type="number" />
          <ConfigInputField label="Pedido Mínimo (R$)" value={config.pedido_minimo} onChange={v => update('pedido_minimo', Number(v))} type="number" />
          <ConfigInputField label="Raio de Entrega (KM)" value={config.raio_entrega_km} onChange={v => update('raio_entrega_km', Number(v))} type="number" />
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-[#e8391a]">payments</span> Formas de Pagamento
        </h3>
        <div className="space-y-3">
<ConfigToggle label="Aceita PIX" checked={config.aceita_pix} onChange={v => update('aceita_pix', v)} />
          <ConfigToggle label="Aceita Cartão" checked={config.aceita_cartao} onChange={v => update('aceita_cartao', v)} />
          <ConfigToggle label="Aceita Dinheiro" checked={config.aceita_dinheiro} onChange={v => update('aceita_dinheiro', v)} />
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830]">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-[#e8391a]">table_restaurant</span> Mesas
        </h3>
        <div className="space-y-4">
<ConfigToggle label="Módulo de Mesas Ativado" checked={config.modulo_mesas_ativado ?? true} onChange={v => update('modulo_mesas_ativado', v)} />
          <div className="grid grid-cols-2 gap-4">
<ConfigInputField label="Número Total de Mesas" value={config.total_mesas ?? 10} onChange={v => update('total_mesas', Number(v))} type="number" />
            <ConfigInputField label="Capacidade por Mesa" value={config.capacidade_mesa ?? 4} onChange={v => update('capacidade_mesa', Number(v))} type="number" />
          </div>
        </div>
      </div>

      {/* Impressão Térmica */}
      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-[#e8391a]">print</span> Impressão Térmica
        </h3>
        <div className="space-y-4">

          {/* ---- Modo QZ Tray ---- */}
          <div className="bg-[#252830]/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Modo: QZ Tray (desktop)</span>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${printer.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-white">{printer.isConnected ? 'Conectado' : 'Desconectado'}</span>
              </div>
            </div>

            {!printer.isConnected && (
              <button
                onClick={printer.connect}
                disabled={printer.isConnecting}
                className="bg-[#e8391a] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d6331a] disabled:opacity-50"
              >
                {printer.isConnecting ? 'Conectando...' : 'Conectar via QZ Tray'}
              </button>
            )}
            {printer.isConnected && (
              <button
                onClick={printer.disconnect}
                className="border border-red-500 text-red-500 px-4 py-2 rounded-lg font-medium hover:bg-red-500 hover:text-white"
              >
                Desconectar
              </button>
            )}

            {printer.error && (
              <p className="text-red-400 text-sm">{printer.error}</p>
            )}

            {!printer.isConnected && !printer.error && (
              <p className="text-xs text-gray-500">
                QZ Tray é um programa que precisa estar instalado e rodando no desktop.
                Baixe em <a href="https://qz.io/download" target="_blank" rel="noopener noreferrer" className="text-[#e8391a] underline">qz.io/download</a>
              </p>
            )}

            {/* Dropdown de impressoras do Windows */}
            {printer.isConnected && (
              <div className="space-y-2">
                <select
                  value={printer.selectedPrinter ?? ''}
                  onChange={(e) => printer.selectPrinter(e.target.value)}
                  className="w-full bg-[#252830] text-white px-3 py-2 rounded-lg border border-[#303030] outline-none focus:border-[#e8391a]"
                >
                  <option value="">Selecione uma impressora</option>
                  {printer.printers.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button
                  onClick={printer.loadPrinters}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Atualizar Lista
                </button>
              </div>
            )}
          </div>

          {/* ---- Separador ---- */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#303030]"></div>
            <span className="text-xs text-gray-500">ou</span>
            <div className="flex-1 h-px bg-[#303030]"></div>
          </div>

          {/* ---- Modo WebUSB ---- */}
          <div className="bg-[#252830]/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Modo: USB direto (browser)</span>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  usbPrinter.status === 'conectada' ? 'bg-green-500'
                  : usbPrinter.status === 'conectando' ? 'bg-yellow-500'
                  : usbPrinter.status === 'imprimindo' ? 'bg-blue-500'
                  : 'bg-red-500'
                }`}></span>
                <span className="text-sm text-white capitalize">{usbPrinter.status}</span>
              </div>
            </div>

            {!usbPrinter.isSupported && (
              <p className="text-xs text-yellow-400">
                WebUSB não suportado neste navegador. Use Chrome ou Edge.
              </p>
            )}

            {usbPrinter.isSupported && usbPrinter.status !== 'conectada' && (
              <button
                onClick={usbPrinter.connect}
                disabled={usbPrinter.status === 'conectando'}
                className="bg-[#e8391a] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d6331a] disabled:opacity-50"
              >
                {usbPrinter.status === 'conectando' ? 'Conectando...' : 'Conectar Impressora USB'}
              </button>
            )}

            {usbPrinter.status === 'conectada' && (
              <>
                <div className="text-sm text-gray-300">
                  {usbPrinter.deviceInfo
                    ? `${usbPrinter.deviceInfo.manufacturerName ?? 'USB'} ${usbPrinter.deviceInfo.productName ?? ''}`
                    : 'Impressora USB conectada'}
                </div>
                <button
                  onClick={usbPrinter.disconnect}
                  className="border border-red-500 text-red-500 px-4 py-2 rounded-lg font-medium hover:bg-red-500 hover:text-white"
                >
                  Desconectar
                </button>
              </>
            )}

            <p className="text-xs text-gray-500">
              Conecta directly via USB — não precisa instalar nada. Funciona com qualquer impressora térmica USB no Chrome/Edge.
            </p>
          </div>

          {/* ---- Configurações gerais (ambos os modos) ---- */}
          <ConfigToggle
            label="Impressão automática ao receber pedido"
            checked={printer.autoPrint}
            onChange={printer.setAutoPrint}
          />

          {/* Paper width */}
          <div>
            <span className="text-sm text-gray-400 mb-2 block">Largura do papel</span>
            <div className="flex gap-2">
              <button
                onClick={() => printer.setPaperWidth('80mm')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  printer.paperWidth === '80mm'
                    ? 'bg-[#e8391a] text-white'
                    : 'bg-[#252830] text-gray-300 hover:bg-[#303030]'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => printer.setPaperWidth('58mm')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  printer.paperWidth === '58mm'
                    ? 'bg-[#e8391a] text-white'
                    : 'bg-[#252830] text-gray-300 hover:bg-[#303030]'
                }`}
              >
                58mm
              </button>
            </div>
          </div>

          {/* Test print */}
          {printer.isConnected && printer.selectedPrinter && (
            <button
              onClick={() => {
                const testOrder: OrderData = {
                  numero: 'TESTE',
                  cliente_nome: 'Cliente Teste',
                  cliente_telefone: '(11) 99999-9999',
                  tipo_entrega: 'balcao',
                  subtotal: 10,
                  taxa_entrega: 0,
                  desconto: 0,
                  total: 10,
                  forma_pagamento: 'Dinheiro',
                  itens: [{ quantidade: 1, nome: 'Produto Teste', preco_unitario: 10 }],
                  estabelecimento_nome: config?.nome_loja || 'Kero Delivery',
                  estabelecimento_endereco: config?.endereco || '',
                  estabelecimento_telefone: config?.telefone || '',
                }
                printer.print(testOrder)
              }}
              className="bg-[#e8391a] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d6331a]"
            >
              Imprimir Teste
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#252830] mb-6">
        <h3 className="font-[Outfit] font-bold text-lg mb-6 flex items-center gap-2 text-white">
          <span className="material-symbols-outlined text-[#e8391a]">analytics</span> Tracking & Analytics
        </h3>
        <div className="space-y-4">
          <ConfigInputField
            label="Meta Pixel ID"
            value={config?.meta_pixel_id || ''}
            onChange={v => update('meta_pixel_id', v)}
            placeholder="1234567890123"
          />
          <p className="text-xs text-gray-500">
            Encontre em: Gerenciador de Anúncios → Fontes de Dados → Pixels
          </p>

          <ConfigInputField
            label="GA4 Measurement ID"
            value={config?.ga4_measurement_id || ''}
            onChange={v => update('ga4_measurement_id', v)}
            placeholder="G-XXXXXXXXXX"
          />
          <p className="text-xs text-gray-500">
            Encontre em: Google Analytics → Admin → Fluxos de dados
          </p>

          <ConfigInputField
            label="UTMfy Token"
            value={config?.utmfy_token || ''}
            onChange={v => update('utmfy_token', v)}
            placeholder="seu-token-utmfy"
          />
          <p className="text-xs text-gray-500">
            Encontre em: utmfy.com → Configurações da conta
          </p>
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
