import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { io } from 'socket.io-client'
import {
  Search,
  MoreVertical,
  Send,
  Check,
  CheckCheck,
  Paperclip,
  Camera,
  Smile,
  Phone,
  Video,
  X,
  LogOut,
  RefreshCw
} from 'lucide-react'

// ============================================
// TIPAGENS
// ============================================
interface WhatsAppMessage {
  id: string
  tenant_id: string
  contato_telefone: string
  contato_nome: string | null
  mensagem: string
  direcao: 'entrada' | 'saida'
  lida: boolean
  created_at: string
}

interface Conversa {
  telefone: string
  nome: string
  ultimaMensagem: string
  timestamp: string
  naoLidas: number
}

interface WhatsAppDevice {
  id: string
  user_id: string | null
  device_name: string
  instance_name: string
  phone_number: string
  state: string
  qr_code: string | null
  created_at: string
  updated_at: string
  tenant_id: string
}

// ============================================
// CONFIGURAÇÃO
// ============================================
const API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3000'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

// ============================================
// UTILITÁRIOS
// ============================================
const formatarHora = (dateStr: string): string => {
  const date = new Date(dateStr)
  return format(date, 'HH:mm', { locale: ptBR })
}

const formatarDataConversa = (dateStr: string): string => {
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm', { locale: ptBR })
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd/MM/yy', { locale: ptBR })
}

const limparTelefone = (telefone: string): string => {
  return telefone.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

const getTenantId = (): string => {
  const configStr = localStorage.getItem('supabase.auth.token')
  if (configStr) {
    try {
      const config = JSON.parse(configStr)
      return config.access_token?.user_metadata?.tenant_id || config.user?.user_metadata?.tenant_id || ''
    } catch {
      return ''
    }
  }
  return ''
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function WhatsAppInboxPage() {
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantId()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Estados
  const [contatoAtivo, setContatoAtivo] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [devices, setDevices] = useState<WhatsAppDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<WhatsAppDevice | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isCreatingDevice, setIsCreatingDevice] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [showDeviceForm, setShowDeviceForm] = useState(false)
  const [connected, setConnected] = useState(false)
  const [conversasMenuOpen, setConversasMenuOpen] = useState(false)

// ============================================
// SOCKET CONNECTION
// ============================================
useEffect(() => {
const newSocket = io(SOCKET_URL)
newSocket.on('connect', () => {
newSocket.emit('join:tenant', tenantId)
setConnected(true)
})
newSocket.on('disconnect', () => setConnected(false))
newSocket.on('device:created', () => loadDevices())
newSocket.on('device:status', (data: { id: string; state: string }) => {
setDevices(prev => prev.map(d => d.id === data.id ? { ...d, state: data.state } : d))
setSelectedDevice(prev => prev ? { ...prev, state: data.state } : null)
if (data.state === 'open') setQrCode(null)
})
newSocket.on('message:new', () => {
queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas', tenantId] })
if (contatoAtivo) {
queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', contatoAtivo, tenantId] })
}
})
// Cleanup: close socket on unmount
return () => {
newSocket.close()
}
}, [tenantId]) // Only depend on tenantId to avoid re-creating socket

  // ============================================
  // LOAD DEVICES
  // ============================================
  const loadDevices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/devices?tenant_id=${tenantId}`)
      const data = await response.json()
      setDevices(data)
      const openDevice = data.find((d: WhatsAppDevice) => d.state === 'open')
      if (openDevice) setSelectedDevice(openDevice)
    } catch (err) {
      console.error('Load devices error:', err)
    }
  }

  useEffect(() => {
    if (tenantId) loadDevices()
  }, [tenantId])

  // ============================================
  // CREATE DEVICE
  // ============================================
  const createDevice = async () => {
    if (!deviceName.trim()) return
    setIsCreatingDevice(true)
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, device_name: deviceName })
      })
      const newDevice = await res.json()
      setDevices(prev => [...prev, newDevice])
      setSelectedDevice(newDevice)
      setDeviceName('')
      setShowDeviceForm(false)
      getQRCode(newDevice.id)
    } catch (err) {
      console.error('Create device error:', err)
    }
    setIsCreatingDevice(false)
  }

  // ============================================
  // GET QR CODE
  // ============================================
  const getQRCode = async (deviceId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/devices/${deviceId}/qr?tenant_id=${tenantId}`)
      const data = await res.json()
      if (data.qr_code) {
        setQrCode(data.qr_code)
      } else if (data.state === 'pending') {
        setTimeout(() => getQRCode(deviceId), 2000)
      }
    } catch (err) {
      console.error('Get QR code error:', err)
    }
  }

  // ============================================
  // QUERIES
  // ============================================
  const { data: mensagensRecentes, isLoading: carregandoConversas } = useQuery<WhatsAppMessage[]>({
    queryKey: ['whatsapp-conversas', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data, error } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data || []
    },
    staleTime: 0,
    enabled: !!tenantId && !!selectedDevice
  })

  const { data: mensagensContato, isLoading: carregandoMensagens } = useQuery<WhatsAppMessage[]>({
    queryKey: ['whatsapp-mensagens', contatoAtivo, tenantId],
    queryFn: async () => {
      if (!contatoAtivo || !tenantId) return []
      const { data, error } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`contato_telefone.eq.${contatoAtivo},contato_telefone.like.${contatoAtivo}@%`)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 0,
    enabled: !!contatoAtivo && !!tenantId
  })

  // ============================================
  // MUTATIONS
  // ============================================
  const mutationMarcarLida = useMutation({
    mutationFn: async (telefone: string) => {
      if (!tenantId) return
      const { data: msgs } = await supabase
        .from('mensagens_whatsapp')
        .select('id')
        .eq('tenant_id', tenantId)
        .or(`contato_telefone.eq.${telefone},contato_telefone.like.${telefone}@%`)
        .eq('lida', false)
        .eq('direcao', 'entrada')
      if (msgs && msgs.length > 0) {
        const ids = msgs.map(m => m.id)
        await supabase.from('mensagens_whatsapp').update({ lida: true }).in('id', ids)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas', tenantId] })
  })

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (contatoAtivo) mutationMarcarLida.mutate(contatoAtivo)
  }, [contatoAtivo])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensagensContato])

  useEffect(() => {
    const channel = supabase
      .channel(`whatsapp-inbox-${tenantId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_whatsapp',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas', tenantId] })
        const novaMsg = payload.new as WhatsAppMessage
        if (contatoAtivo && limparTelefone(novaMsg.contato_telefone) === contatoAtivo) {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', contatoAtivo, tenantId] })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient, contatoAtivo, tenantId])

  // ============================================
  // HANDLERS
  // ============================================
  const handleSelecionarConversa = (telefone: string) => setContatoAtivo(telefone)

  const sendMessage = async () => {
    if (!messageText.trim() || !contatoAtivo || !selectedDevice || isSending) return
    setIsSending(true)
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, conversation_id: contatoAtivo, text: messageText.trim() })
      })
      if (response.ok) {
        setMessageText('')
        queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', contatoAtivo, tenantId] })
      }
    } catch (err) {
      console.error('Send error:', err)
    }
    setIsSending(false)
  }

  // ============================================
  // COMPUTED
  // ============================================
  const conversas: Conversa[] = useMemo(() => {
    if (!mensagensRecentes) return []
    const mapa = new Map<string, WhatsAppMessage>()
    for (const msg of mensagensRecentes) {
      const telefone = limparTelefone(msg.contato_telefone)
      if (!mapa.has(telefone)) mapa.set(telefone, msg)
    }
    const array: Conversa[] = []
    for (const [telefone, msg] of mapa) {
      const naoLidas = mensagensRecentes.filter(
        m => limparTelefone(m.contato_telefone) === telefone && !m.lida && m.direcao === 'entrada'
      ).length
      array.push({
        telefone,
        nome: msg.contato_nome || telefone,
        ultimaMensagem: msg.mensagem,
        timestamp: msg.created_at,
        naoLidas
      })
    }
    return array.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [mensagensRecentes])

  const conversasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return conversas
    const term = searchTerm.toLowerCase()
    return conversas.filter(c => c.nome.toLowerCase().includes(term) || c.telefone.includes(term))
  }, [conversas, searchTerm])

  const contatoSelecionado = useMemo(() => {
    return conversas.find(c => c.telefone === contatoAtivo) || null
  }, [conversas, contatoAtivo])

  // ============================================
  // RENDER - ESTADO: MOSTRANDO QR CODE
  // ============================================
  if (qrCode) {
    return (
      <div className="h-[calc(100vh-100px)] w-full flex items-center justify-center bg-[#00a884]" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <div className="bg-white rounded-lg p-8 text-center max-w-sm shadow-2xl">
          <h2 className="text-xl font-semibold text-[#111b21] mb-2">Conectar ao WhatsApp</h2>
          <p className="text-sm text-[#667781] mb-6">
            Escaneie o código QR com seu WhatsApp para sincronizar suas conversas
          </p>
          <div className="bg-white p-4 rounded-lg border-2 border-[#dfe5e7] inline-block mb-4">
            <img
              src={`https://api.qrserver.com/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
              alt="QR Code"
              className="w-48 h-48 mx-auto"
            />
          </div>
          <div className="text-xs text-[#667781] space-y-1 mb-6">
            <p><strong>Como conectar:</strong></p>
            <ol className="text-left list-decimal list-inside space-y-1">
              <li>Abra WhatsApp no celular</li>
              <li>Toque em ⋮ → Aparelhos conectados</li>
              <li>Escaneie o código acima</li>
            </ol>
          </div>
          <button
            onClick={() => setQrCode(null)}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#f0f2f5] text-[#111b21] rounded-lg hover:bg-[#e9edef] transition-colors"
          >
            <X size={16} /> Cancelar
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER - ESTADO: SEM DISPOSITIVO
  // ============================================
  if (!selectedDevice || devices.length === 0) {
    return (
      <div className="h-[calc(100vh-100px)] w-full flex items-center justify-center bg-[#00a884]" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <div className="bg-white rounded-lg p-8 text-center max-w-md shadow-2xl">
          <div className="w-20 h-20 bg-[#dfe5e7] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#54656f]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#111b21] mb-2">Conecte seu WhatsApp</h2>
          <p className="text-sm text-[#667781] mb-6">
            Para usar o WhatsApp Web, você precisa conectar um dispositivo ativo
          </p>
          <button
            onClick={() => setShowDeviceForm(true)}
            className="bg-[#00a884] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#009688] transition-colors"
          >
            Conectar Dispositivo
          </button>

          {showDeviceForm && (
            <div className="mt-6 p-4 bg-[#f0f2f5] rounded-lg">
              <input
                type="text"
                placeholder="Nome do dispositivo"
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && createDevice()}
                className="w-full p-3 rounded-lg border border-[#dfe5e7] text-sm mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={createDevice}
                  disabled={isCreatingDevice}
                  className="flex-1 bg-[#00a884] text-white py-2 rounded-lg font-medium hover:bg-[#009688] transition-colors disabled:opacity-50"
                >
                  {isCreatingDevice ? 'Criando...' : 'Criar'}
                </button>
                <button
                  onClick={() => { setShowDeviceForm(false); setDeviceName('') }}
                  className="px-4 py-2 bg-[#f0f2f5] text-[#667781] rounded-lg font-medium hover:bg-[#e9edef] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER - LAYOUT PRINCIPAL (WHATSAPP WEB STYLE)
  // ============================================
  return (
    <div className="h-[calc(100vh-100px)] w-full flex bg-[#dddbd1] overflow-hidden" style={{ fontFamily: 'Segoe UI, sans-serif' }}>

      {/* ============================================ */}
      {/* SIDEBAR ESQUERDA - LISTA DE CONVERSAS */}
      {/* ============================================ */}
      <div className="w-[30%] min-w-[300px] max-w-[450px] flex flex-col bg-[#ffffff] border-r border-[#dfe5e7]">

        {/* HEADER */}
        <div className="flex items-center justify-between p-3 bg-[#f0f2f5]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || 'User')}&background=00a884&color=fff&size=40`}
                alt="Avatar"
                className="w-10 h-10 rounded-full"
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#f0f2f5] ${connected ? 'bg-[#00a884]' : 'bg-[#999]'}`} />
            </div>
            <span className="text-sm font-medium text-[#111b21]">
              {user?.user_metadata?.full_name || 'Usuário'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors">
              <RefreshCw size={20} className="text-[#54656f]" onClick={() => loadDevices()} />
            </button>
            <button
              onClick={() => setShowDeviceForm(true)}
              className="p-2 hover:bg-[#e9edef] rounded-full transition-colors"
              title="Adicionar dispositivo"
            >
              <svg className="w-5 h-5 text-[#54656f]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
            <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors">
              <MoreVertical size={20} className="text-[#54656f]" />
            </button>
          </div>
        </div>

        {/* FORMULÁRIO DISPOSITIVO */}
        {showDeviceForm && (
          <div className="p-3 bg-[#f0f2f5] border-b border-[#dfe5e7]">
            <input
              type="text"
              placeholder="Nome do dispositivo"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && createDevice()}
              className="w-full p-2.5 rounded-lg border border-[#dfe5e7] text-sm mb-2 focus:outline-none focus:border-[#00a884]"
            />
            <div className="flex gap-2">
              <button
                onClick={createDevice}
                disabled={isCreatingDevice}
                className="flex-1 bg-[#00a884] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#009688] transition-colors disabled:opacity-50"
              >
                {isCreatingDevice ? 'Criando...' : 'Criar'}
              </button>
              <button
                onClick={() => { setShowDeviceForm(false); setDeviceName('') }}
                className="px-4 py-2 bg-[#e9edef] text-[#54656f] rounded-lg text-sm font-medium hover:bg-[#dfe5e7] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* BARRA DE BUSCA */}
        <div className="p-2 bg-[#ffffff]">
          <div className="flex items-center bg-[#f0f2f5] rounded-lg px-3 py-2">
            <Search size={18} className="text-[#54656f]" />
            <input
              type="text"
              placeholder="Pesquisar ou começar uma nova conversa"
              className="flex-1 bg-transparent border-none outline-none text-sm text-[#111b21] ml-2 placeholder:text-[#667781]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* LISTA DE DISPOSITIVOS */}
        <div className="px-3 py-2 bg-[#ffffff] border-b border-[#dfe5e7]">
          <div className="flex items-center gap-2 text-xs text-[#667781] mb-2">
            <span>Dispositivos conectados</span>
            {selectedDevice?.state === 'open' && (
              <span className="flex items-center gap-1 text-[#00a884]">
                <span className="w-2 h-2 bg-[#00a884] rounded-full"></span>
                Conectado
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {devices.map(device => (
              <div
                key={device.id}
                onClick={() => { setSelectedDevice(device); if (device.state !== 'open') getQRCode(device.id) }}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selectedDevice?.id === device.id
                    ? 'bg-[#d9fdd3] border border-[#00a884]'
                    : 'bg-[#f0f2f5] hover:bg-[#e9edef]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  device.state === 'open' ? 'bg-[#00a884]' : device.state === 'connecting' ? 'bg-[#f7c659]' : 'bg-[#999]'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#111b21] truncate max-w-[100px]">{device.device_name}</div>
                  <div className="text-[10px] text-[#667781]">
                    {device.state === 'open' ? 'Conectado' : device.state === 'connecting' ? 'Conectando...' : 'Desconectado'}
                  </div>
                </div>
                {device.state !== 'open' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); getQRCode(device.id) }}
                    className="p-1 hover:bg-[#c5e1c8] rounded transition-colors"
                    title="Conectar"
                  >
                    <svg className="w-4 h-4 text-[#00a884]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM12 18c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm5.5-6c0-3.04-2.46-5.5-5.5-5.5S6.5 8.96 6.5 12s2.46 5.5 5.5 5.5 5.5-2.46 5.5-5.5z"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* LISTA DE CONVERSAS */}
        <div className="flex-1 overflow-y-auto bg-[#ffffff]">
          {carregandoConversas ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-16 h-16 bg-[#f0f2f5] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#667781]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
              </div>
              <p className="text-sm text-[#667781]">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
              <p className="text-xs text-[#667781] mt-1">
                {searchTerm ? 'Tente outro termo de busca' : 'Suas mensagens aparecerão aqui'}
              </p>
            </div>
          ) : (
            conversasFiltradas.map((conversa) => (
              <div
                key={conversa.telefone}
                onClick={() => handleSelecionarConversa(conversa.telefone)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[#dfe5e7] ${
                  contatoAtivo === conversa.telefone ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(conversa.nome)}&background=random&color=fff&size=50`}
                    alt={conversa.nome}
                    className="w-12 h-12 rounded-full"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 border-b border-[#dfe5e7]">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-semibold text-sm text-[#111b21] truncate">{conversa.nome}</h3>
                    <span className={`text-[11px] ${conversa.naoLidas > 0 ? 'text-[#00a884]' : 'text-[#667781]'}`}>
                      {formatarDataConversa(conversa.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-[#667781] truncate flex-1 pr-2">
                      {conversa.ultimaMensagem.length > 50
                        ? conversa.ultimaMensagem.substring(0, 50) + '...'
                        : conversa.ultimaMensagem}
                    </p>
                    {conversa.naoLidas > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-[#00a884] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {conversa.naoLidas}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* ÁREA DIREITA - CONVERSA */}
      {/* ============================================ */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">

        {contatoAtivo && mensagensContato ? (
          <>
            {/* HEADER DA CONVERSA */}
            <div className="flex items-center justify-between p-3 bg-[#f0f2f5] border-b border-[#dfe5e7]">
              <div className="flex items-center gap-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contatoSelecionado?.nome || contatoAtivo)}&background=random&color=fff&size=45`}
                  alt={contatoSelecionado?.nome}
                  className="w-11 h-11 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-[#111b21]">{contatoSelecionado?.nome || contatoAtivo}</h3>
                  <p className="text-xs text-[#667781]">{contatoAtivo}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors">
                  <Video size={20} className="text-[#54656f]" />
                </button>
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors">
                  <Phone size={20} className="text-[#54656f]" />
                </button>
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors">
                  <MoreVertical size={20} className="text-[#54656f]" />
                </button>
              </div>
            </div>

            {/* MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {carregandoMensagens ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                mensagensContato.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[65%] px-3 py-2 rounded-lg relative shadow-sm ${
                      msg.direcao === 'saida'
                        ? 'bg-[#d9fdd3] text-[#111b21]'
                        : 'bg-[#ffffff] text-[#111b21]'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.mensagem}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-[#667781]">
                          {formatarHora(msg.created_at)}
                        </span>
                        {msg.direcao === 'saida' && (
                          <span className="text-[#667781]">
                            {msg.lida ? <CheckCheck size={14} className="text-[#53bdeb]" /> : <Check size={14} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT DE MENSAGEM */}
            {selectedDevice?.state === 'open' ? (
              <div className="flex items-center gap-2 p-3 bg-[#f0f2f5]">
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors">
                  <Smile size={24} className="text-[#54656f]" />
                </button>
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors">
                  <Paperclip size={24} className="text-[#54656f]" />
                </button>
                <div className="flex-1 flex items-center bg-[#ffffff] rounded-lg px-4 py-2">
                  <input
                    type="text"
                    placeholder="Digite uma mensagem"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-[#111b21]"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || isSending}
                  className="p-3 bg-[#00a884] rounded-full hover:bg-[#009688] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={20} className="text-white" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 p-3 bg-[#f0f2f5] text-[#667781] text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
                </svg>
                <span>Dispositivo desconectado. Reconecte para enviar mensagens.</span>
              </div>
            )}
          </>
        ) : (
          /* ESTADO VAZIO */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
            <div className="w-80 h-80 bg-[#d9fdd3] rounded-full flex items-center justify-center mb-6">
              <svg className="w-40 h-40 text-[#00a884]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-light text-[#41525d] mb-2">WhatsApp Web</h2>
            <p className="text-sm text-[#667781] text-center max-w-md">
              Selecione uma conversa na lista ao lado para começar a conversar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}