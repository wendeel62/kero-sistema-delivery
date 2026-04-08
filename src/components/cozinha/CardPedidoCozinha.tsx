import { useEffect, useState } from 'react'
import { playIniciarPreparoSound, playProntoSound } from '../../utils/audioKDS'

interface ItemPedido {
  id: string
  produto_nome: string
  quantidade: number
  tamanho?: string
  adicionais?: string
  observacoes?: string
}

interface PedidoCardProps {
  id: string
  numero: number
  tipo: string
  created_at: string
  observacoes?: string
  itens: ItemPedido[]
  coluna: 'novo' | 'em_preparo'
  onIniciarPreparo: (id: string) => Promise<void>
  onMarcarPronto: (id: string) => Promise<void>
}

export default function CardPedidoCozinha({
  id,
  numero,
  tipo,
  created_at,
  observacoes,
  itens,
  coluna,
  onIniciarPreparo,
  onMarcarPronto,
}: PedidoCardProps) {
  const [tempo, setTempo] = useState('00:00')
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(false)

  useEffect(() => {
    const atualizarTempo = () => {
      const agora = Date.now()
      const criado = new Date(created_at).getTime()
      const diff = Math.floor((agora - criado) / 1000)
      const mins = Math.floor(diff / 60)
      const secs = diff % 60
      setTempo(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`)
    }

    atualizarTempo()
    const interval = setInterval(atualizarTempo, 1000)
    return () => clearInterval(interval)
  }, [created_at])

  const getCronometroClasse = () => {
    const [mins] = tempo.split(':').map(Number)
    if (mins >= 30) return 'text-red-500 animate-pulse'
    if (mins >= 15) return 'text-yellow-400'
    return 'text-green-400'
  }

  const handleAcao = async () => {
    if (acaoEmAndamento) return
    setAcaoEmAndamento(true)
    try {
      if (coluna === 'novo') {
        await onIniciarPreparo(id)
        playIniciarPreparoSound()
      } else {
        await onMarcarPronto(id)
        playProntoSound()
      }
    } finally {
      setAcaoEmAndamento(false)
    }
  }

  const getTipoBadge = () => {
    const badges: Record<string, string> = {
      balcao: '#e8391a',
      whatsapp: '#25d366',
      ifood: '#ff0000',
      rappi: '#000000',
      entrega: '#f57c24',
      mesa: '#7c4dff',
    }
    return badges[tipo?.toLowerCase()] || '#e8391a'
  }

  return (
    <div className="bg-[#1e2028] rounded-xl border border-[#252830] overflow-hidden animate-fade-in">
      <div className="bg-[#252830] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            #{String(numero).padStart(4, '0')}
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white"
            style={{ backgroundColor: getTipoBadge() }}
          >
            {tipo}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-mono font-bold ${getCronometroClasse()}`}>
          <span className="material-symbols-outlined text-lg">schedule</span>
          {tempo}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {itens.map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[#f57c24] font-bold text-lg">{item.quantidade}x</span>
                <span className="text-white font-medium">{item.produto_nome}</span>
              </div>
              {item.tamanho && (
                <span className="text-white/50 text-sm ml-8">{item.tamanho}</span>
              )}
              {item.adicionais && (
                <span className="text-white/40 text-sm ml-8 block">{item.adicionais}</span>
              )}
              {item.observacoes && (
                <span className="text-yellow-400 text-sm ml-8 italic block">
                  Obs: {item.observacoes}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {observacoes && (
        <div className="px-4 pb-3">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 flex items-start gap-2">
            <span className="material-symbols-outlined text-yellow-400 text-lg">warning</span>
            <span className="text-yellow-400 text-sm">{observacoes}</span>
          </div>
        </div>
      )}

      <div className="p-4 pt-0">
        {coluna === 'novo' ? (
          <button
            onClick={handleAcao}
            disabled={acaoEmAndamento}
            className="w-full py-3 bg-[#f57c24] hover:bg-[#e06c1a] disabled:opacity-50 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined">local_fire_department</span>
            Iniciar Preparo
          </button>
        ) : (
          <button
            onClick={handleAcao}
            disabled={acaoEmAndamento}
            className="w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined">check</span>
            Pronto
          </button>
        )}
      </div>
    </div>
  )
}
