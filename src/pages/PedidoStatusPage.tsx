import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import NpsWidget from '../components/NpsWidget'

interface Pedido {
  id: string
  numero: number
  cliente_nome: string
  cliente_telefone: string
  total: number
  status: string
  forma_pagamento: string
  created_at: string
  endereco_entrega?: string
  nps_nota: number | null
  nps_respondido: boolean
  itens?: Array<{
    nome: string
    quantidade: number
    preco: number
  }>
}

const statusSteps = [
  { key: 'pendente', label: 'Pedido Recebido', icon: 'receipt_long', color: 'text-blue-500' },
  { key: 'confirmado', label: 'Confirmado', icon: 'check_circle', color: 'text-blue-500' },
  { key: 'preparando', label: 'Em Preparo', icon: 'skillet', color: 'text-orange-500' },
  { key: 'pronto', label: 'Pronto', icon: 'task_alt', color: 'text-purple-500' },
  { key: 'saiu_entrega', label: 'Saiu para Entrega', icon: 'delivery_dining', color: 'text-purple-500' },
  { key: 'entregue', label: 'Entregue', icon: 'celebration', color: 'text-green-500' },
]

export default function PedidoStatusPage() {
  const { numero } = useParams<{ numero: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [tabelaOrigem, setTabelaOrigem] = useState<'pedidos' | 'pedidos_online'>('pedidos')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const fetchPedido = async () => {
      if (!numero) {
        setErro('Número do pedido não informado')
        setLoading(false)
        return
      }

      // Buscar em pedidos primeiro
      let { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('numero', parseInt(numero))
        .maybeSingle()

      if (data) {
        setTabelaOrigem('pedidos')
      } else {
        // Se não encontrou, buscar em pedidos_online
        const result = await supabase
          .from('pedidos_online')
          .select('*')
          .eq('numero', parseInt(numero))
          .maybeSingle()
        data = result.data
        if (data) {
          setTabelaOrigem('pedidos_online')
        }
      }

      if (!data) {
        setErro('Pedido não encontrado')
        setLoading(false)
        return
      }

      setPedido(data as Pedido)
      setLoading(false)
    }

    fetchPedido()

    // Realtime listener para pedidos
    const channelPedidos = supabase
      .channel(`pedido-pedidos-${numero}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `numero=eq.${numero}`,
        },
        (payload) => {
          setPedido(payload.new as Pedido)
          setTabelaOrigem('pedidos')
        }
      )
      .subscribe()

    // Realtime listener para pedidos_online
    const channelOnline = supabase
      .channel(`pedido-online-${numero}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos_online',
          filter: `numero=eq.${numero}`,
        },
        (payload) => {
          setPedido(payload.new as Pedido)
          setTabelaOrigem('pedidos_online')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelPedidos)
      supabase.removeChannel(channelOnline)
    }
  }, [numero])

  const getStatusIndex = (status: string) => {
    const index = statusSteps.findIndex(s => s.key === status)
    return index >= 0 ? index : 0
  }

  const getCurrentStepIndex = () => {
    if (!pedido) return 0
    return getStatusIndex(pedido.status)
  }

  const getTempoDecorrido = () => {
    if (!pedido) return ''
    const mins = differenceInMinutes(new Date(), parseISO(pedido.created_at))
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}min`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0f14] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (erro || !pedido) {
    return (
      <div className="min-h-screen bg-[#0e0f14] flex items-center justify-center p-6">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">error</span>
          <h2 className="text-2xl font-bold text-white mb-2">Pedido não encontrado</h2>
          <p className="text-gray-400">{erro || 'Verifique o número do pedido'}</p>
        </div>
      </div>
    )
  }

  const currentStep = getCurrentStepIndex()
  const isEntregue = pedido.status === 'entregue'
  const showNps = isEntregue && !pedido.nps_respondido

  return (
    <div className="min-h-screen bg-[#0e0f14]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0e0f14]/95 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm font-bold">restaurant</span>
            </div>
            <span className="text-lg font-bold italic text-primary-container">KERO</span>
          </div>
          <span className="text-sm text-gray-400">
            {getTempoDecorrido()} atrás
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Número do pedido */}
        <div className="text-center mb-8">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Pedido</span>
          <h1 className="text-4xl font-bold text-white font-[Outfit]">
            #{String(pedido.numero).padStart(4, '0')}
          </h1>
          <p className="text-gray-400 mt-1">{pedido.cliente_nome}</p>
          <p className="text-2xl font-bold text-green-400 mt-2">
            R$ {pedido.total.toFixed(2)}
          </p>
        </div>

        {/* Timeline de Status */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">
            Status do Pedido
          </h2>
          <div className="relative">
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep

              return (
                <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                  {/* Linha conectora */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                            ? 'bg-primary text-white animate-pulse shadow-lg shadow-primary/50'
                            : 'bg-gray-800 text-gray-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {isCompleted ? 'check' : step.icon}
                      </span>
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`w-0.5 h-12 mt-2 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-800'
                        }`}
                      />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 pt-2">
                    <h3
                      className={`font-bold ${
                        isCompleted
                          ? 'text-green-400'
                          : isCurrent
                            ? 'text-white'
                            : 'text-gray-600'
                      }`}
                    >
                      {step.label}
                    </h3>
                    {isCurrent && !isEntregue && (
                      <p className="text-xs text-gray-500 mt-1">Em andamento...</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Badge de avaliação já enviada */}
        {pedido.nps_respondido && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-500 text-2xl">verified</span>
              <div>
                <p className="text-sm font-bold text-green-400">Avaliação enviada ✓</p>
                <p className="text-xs text-gray-400">
                  Nota: <span className="font-bold text-white">{pedido.nps_nota}/10</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NPS Widget - aparece apenas se entregue e não respondido */}
        {showNps && (
          <div className="mb-6">
            <NpsWidget
              pedidoId={pedido.id}
              titulo="Seu pedido chegou! Avalie sua experiência"
              variant="pedido"
              tabela={tabelaOrigem}
              onComplete={(nota) => {
                setPedido(prev => prev ? { ...prev, nps_nota: nota, nps_respondido: true } : null)
              }}
            />
          </div>
        )}

        {/* Resumo do pedido */}
        <div className="bg-[#1a1b23] rounded-2xl p-5 border border-white/10">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Resumo
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pagamento</span>
              <span className="text-white font-medium capitalize">{pedido.forma_pagamento}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Horário</span>
              <span className="text-white font-medium">
                {format(parseISO(pedido.created_at), "HH:mm", { locale: ptBR })}
              </span>
            </div>
            {pedido.endereco_entrega && (
              <div className="pt-3 border-t border-white/10">
                <span className="text-gray-400 text-xs">Endereço de entrega</span>
                <p className="text-white text-sm mt-1">{pedido.endereco_entrega}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
