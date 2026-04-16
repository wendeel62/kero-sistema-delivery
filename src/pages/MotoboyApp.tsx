import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Motoboy } from '../types'

interface EntregaMotoboy {
  id: string
  pedido_id: string
  status: 'atribuido' | 'coletado' | 'entregue'
  atribuido_em: string
  coletado_em: string | null
  entregue_em: string | null
  pedido?: {
    numero: number
    cliente_nome: string
    endereco_entrega: string
    total: number
    observacoes?: string
  }
}

export default function MotoboyApp() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [motoboy, setMotoboy] = useState<Motoboy | null>(null)
  const [entregas, setEntregas] = useState<EntregaMotoboy[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  useEffect(() => {
    const verificarToken = async () => {
      if (!token) {
        setErro('Link inválido ou expirado')
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('motoboys')
        .select('*')
        .eq('token_acesso', token)
        .maybeSingle()

      if (!data) {
        setErro('Link inválido ou expirado')
        setLoading(false)
        return
      }

      setMotoboy(data)
      setLoading(false)

      // Solicitar geolocalização
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            supabase
              .from('motoboys')
              .update({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              })
              .eq('id', data.id)
          },
          // () => console.log('Permissão de geolocalização negada')
        )
      }
    }

    verificarToken()
  }, [token])

  const fetchEntregas = useCallback(async () => {
    if (!motoboy) return

    const { data: entregasData } = await supabase
      .from('entregas')
      .select('*')
      .eq('motoboy_id', motoboy.id)
      .in('status', ['atribuido', 'coletado'])
      .order('atribuido_em', { ascending: false })

    if (entregasData) {
      const entregasCompletas = await Promise.all(
        entregasData.map(async (e) => {
          const { data: pedido } = await supabase
            .from('pedidos')
            .select('numero, cliente_nome, endereco_entrega, total, observacoes')
            .eq('id', e.pedido_id)
            .single()

          return { ...e, pedido }
        })
      )
      setEntregas(entregasCompletas as EntregaMotoboy[])
    }
  }, [motoboy])

  useEffect(() => {
    if (motoboy) {
      fetchEntregas()
    }
  }, [motoboy, fetchEntregas])

  // Realtime listener
  useEffect(() => {
    if (!motoboy) return

    const channel = supabase
      .channel(`entregas-motoboy-${motoboy.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entregas',
          filter: `motoboy_id=eq.${motoboy.id}`,
        },
        () => {
          fetchEntregas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [motoboy, fetchEntregas])

  const coletarPedido = async (entregaId: string) => {
    setAtualizando(entregaId)
    await supabase
      .from('entregas')
      .update({
        status: 'coletado',
        coletado_em: new Date().toISOString(),
      })
      .eq('id', entregaId)

    if (motoboy) {
      await supabase
        .from('motoboys')
        .update({ status: 'em_entrega' })
        .eq('id', motoboy.id)
    }

    setAtualizando(null)
    fetchEntregas()
  }

  const confirmarEntrega = async (entregaId: string) => {
    setAtualizando(entregaId)
    await supabase
      .from('entregas')
      .update({
        status: 'entregue',
        entregue_em: new Date().toISOString(),
      })
      .eq('id', entregaId)

    // Atualizar status do pedido
    const entrega = entregas.find(e => e.id === entregaId)
    if (entrega) {
      await supabase
        .from('pedidos')
        .update({ status: 'entregue' })
        .eq('id', entrega.pedido_id)
    }

    // Verificar se ainda há entregas pendentes
    const { data: pendentes } = await supabase
      .from('entregas')
      .select('id')
      .eq('motoboy_id', motoboy?.id)
      .in('status', ['atribuido', 'coletado'])

    if (pendentes?.length === 0 && motoboy) {
      await supabase
        .from('motoboys')
        .update({ status: 'disponivel' })
        .eq('id', motoboy.id)
    }

    setAtualizando(null)
    fetchEntregas()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0f14] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-[#0e0f14] flex items-center justify-center p-6">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">error</span>
          <h2 className="text-2xl font-bold text-white mb-2">Link Inválido</h2>
          <p className="text-gray-400">{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0e0f14] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0e0f14]/95 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm font-bold">restaurant</span>
            </div>
            <span className="text-lg font-bold italic text-primary-container">KERO</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-300">{motoboy?.nome}</span>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
              motoboy?.status === 'disponivel'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              {motoboy?.status === 'disponivel' ? 'Livre' : 'Em Entrega'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {entregas.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-gray-600 mb-4 block">local_shipping</span>
            <h3 className="text-xl font-bold text-gray-400 mb-2">Nenhuma entrega</h3>
            <p className="text-gray-500 text-sm">Aguarde novas atribuições</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entregas.map(entrega => (
              <div
                key={entrega.id}
                className={`bg-[#1a1b23] rounded-2xl p-5 border transition-all ${
                  entrega.status === 'coletado'
                    ? 'border-orange-500/30'
                    : 'border-blue-500/30'
                }`}
              >
                {/* Número do pedido e cliente */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-primary text-xs font-bold uppercase tracking-wider">
                      Pedido
                    </span>
                    <h3 className="text-2xl font-bold text-white">
                      #{entrega.pedido?.numero ? String(entrega.pedido.numero).padStart(4, '0') : '---'}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    entrega.status === 'coletado'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {entrega.status === 'coletado' ? 'A Caminho' : 'Aguardando'}
                  </span>
                </div>

                {/* Nome do cliente */}
                <div className="mb-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Cliente</span>
                  <p className="text-lg font-bold text-white">{entrega.pedido?.cliente_nome}</p>
                </div>

                {/* Endereço */}
                <div className="mb-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Endereço</span>
                  <p className="text-base text-gray-300 leading-relaxed">
                    {entrega.pedido?.endereco_entrega || 'Endereço não informado'}
                  </p>
                </div>

                {/* Valor */}
                <div className="mb-5">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Valor</span>
                  <p className="text-xl font-bold text-green-400">
                    R$ {entrega.pedido?.total?.toFixed(2) || '0.00'}
                  </p>
                </div>

                {/* Observações */}
                {entrega.pedido?.observacoes && (
                  <div className="mb-5 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                    <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider block mb-1">
                      Observação
                    </span>
                    <p className="text-sm text-yellow-200">{entrega.pedido.observacoes}</p>
                  </div>
                )}

                {/* Botões de ação */}
                {entrega.status === 'atribuido' ? (
                  <button
                    onClick={() => coletarPedido(entrega.id)}
                    disabled={atualizando === entrega.id}
                    className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: '#f57c24' }}
                  >
                    {atualizando === entrega.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Atualizando...
                      </div>
                    ) : (
                      'Coletei o Pedido'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => confirmarEntrega(entrega.id)}
                    disabled={atualizando === entrega.id}
                    className="w-full py-4 rounded-xl font-bold text-base bg-green-500 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {atualizando === entrega.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Confirmando...
                      </div>
                    ) : (
                      'Entreguei'
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
