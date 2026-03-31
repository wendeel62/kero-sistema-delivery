import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface NpsWidgetProps {
  pedidoId: string
  titulo?: string
  onComplete?: (nota: number) => void
  variant?: 'cardapio' | 'pedido'
  tabela?: 'pedidos' | 'pedidos_online'
}

const npsLabels: Record<number, { label: string; emoji: string; color: string }> = {
  0: { label: 'Péssimo', emoji: '😡', color: 'border-red-500 bg-red-500/10' },
  1: { label: 'Muito Ruim', emoji: '😠', color: 'border-red-500 bg-red-500/10' },
  2: { label: 'Ruim', emoji: '😞', color: 'border-orange-500 bg-orange-500/10' },
  3: { label: 'Insatisfeito', emoji: '😕', color: 'border-orange-500 bg-orange-500/10' },
  4: { label: 'Regular', emoji: '😐', color: 'border-yellow-500 bg-yellow-500/10' },
  5: { label: 'Neutro', emoji: '😶', color: 'border-yellow-500 bg-yellow-500/10' },
  6: { label: 'OK', emoji: '🙂', color: 'border-yellow-500 bg-yellow-500/10' },
  7: { label: 'Bom', emoji: '😊', color: 'border-lime-500 bg-lime-500/10' },
  8: { label: 'Muito Bom', emoji: '😄', color: 'border-green-500 bg-green-500/10' },
  9: { label: 'Excelente', emoji: '🤩', color: 'border-green-500 bg-green-500/10' },
  10: { label: 'Incrível!', emoji: '🥳', color: 'border-emerald-500 bg-emerald-500/10' },
}

export default function NpsWidget({ pedidoId, titulo = 'Como foi sua experiência?', onComplete, variant = 'cardapio', tabela = 'pedidos' }: NpsWidgetProps) {
  const [nota, setNota] = useState<number | null>(null)
  const [hoveredNota, setHoveredNota] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [notaEnviada, setNotaEnviada] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (nota === null) return
    if (!pedidoId) {
      setErro('ID do pedido não encontrado')
      console.error('NPS: pedidoId está vazio ou null')
      return
    }

    setEnviando(true)
    setErro(null)

    console.log('NPS: Enviando avaliação...', { pedidoId, tabela, nota })

    try {
      const { data, error } = await supabase
        .from(tabela)
        .update({
          nps_nota: nota,
          nps_respondido: true,
        })
        .eq('id', pedidoId)
        .select()

      console.log('NPS: Resposta do Supabase', { data, error })

      if (error) {
        console.error('NPS: Erro ao salvar:', error)
        setErro(`Erro ao enviar: ${error.message}`)
        setEnviando(false)
        return
      }

      if (!data || data.length === 0) {
        console.error('NPS: Nenhum registro atualizado. Verifique se o ID existe na tabela:', tabela)
        setErro('Não foi possível enviar a avaliação. Tente novamente.')
        setEnviando(false)
        return
      }

      console.log('NPS: Avaliação salva com sucesso!', data)
      setEnviado(true)
      setNotaEnviada(nota)
      onComplete?.(nota)
    } catch (err) {
      console.error('NPS: Erro inesperado:', err)
      setErro('Erro inesperado ao enviar avaliação')
    }

    setEnviando(false)
  }

  if (enviado) {
    return (
      <div className={`rounded-2xl p-8 ${variant === 'cardapio' ? 'bg-surface-container-lowest border border-outline-variant/10' : 'bg-green-500/10 border border-green-500/20'}`}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Feedback Recebido!</h3>
          <p className="text-on-surface-variant mb-4">
            Obrigado por nos avaliar!
          </p>
          <div className="inline-flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full">
            <span className="text-2xl">{npsLabels[notaEnviada!]?.emoji}</span>
            <span className="font-bold text-lg text-primary">{notaEnviada}/10</span>
          </div>
        </div>
      </div>
    )
  }

  const displayNota = hoveredNota ?? nota
  const labelInfo = displayNota !== null ? npsLabels[displayNota] : null

  return (
    <div className={`rounded-2xl p-6 ${variant === 'cardapio' ? 'bg-surface-container-lowest border border-outline-variant/10' : 'bg-surface-container border border-outline-variant/10'}`}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-on-surface mb-1">{titulo}</h3>
        <p className="text-xs text-on-surface-variant">De 0 a 10, qual a probabilidade de você nos recomendar?</p>
      </div>

      {/* Nota selecionada com emoji */}
      {labelInfo && (
        <div className="text-center mb-4">
          <span className="text-4xl mb-2 block">{labelInfo.emoji}</span>
          <span className={`text-base font-bold ${displayNota !== null && displayNota >= 7 ? 'text-green-500' : displayNota !== null && displayNota >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>
            {labelInfo.label}
          </span>
        </div>
      )}

      {/* Grid de botões NPS */}
      <div className="grid grid-cols-11 gap-1 mb-4">
        {Array.from({ length: 11 }, (_, i) => {
          const isSelected = nota === i
          const isHovered = hoveredNota === i
          const colorClass = i <= 6 ? 'red' : i <= 8 ? 'yellow' : 'green'

          return (
            <button
              key={i}
              onClick={() => setNota(i)}
              onMouseEnter={() => setHoveredNota(i)}
              onMouseLeave={() => setHoveredNota(null)}
              className={`
                aspect-square rounded-lg font-bold text-sm transition-all duration-200
                ${isSelected
                  ? colorClass === 'red'
                    ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30'
                    : colorClass === 'yellow'
                      ? 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/30'
                      : 'bg-green-500 text-white scale-110 shadow-lg shadow-green-500/30'
                  : isHovered
                    ? colorClass === 'red'
                      ? 'bg-red-500/20 text-red-500 border-2 border-red-500'
                      : colorClass === 'yellow'
                        ? 'bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500'
                        : 'bg-green-500/20 text-green-500 border-2 border-green-500'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border border-outline-variant/10'
                }
              `}
            >
              {i}
            </button>
          )
        })}
      </div>

      {/* Labels dos extremos */}
      <div className="flex justify-between text-[10px] text-on-surface-variant mb-6 px-1">
        <span>Nada provável</span>
        <span>Muito provável</span>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-500 text-center">{erro}</p>
        </div>
      )}

      {/* Botão enviar */}
      <button
        onClick={handleSubmit}
        disabled={nota === null || enviando || !pedidoId}
        className={`
          w-full py-4 rounded-xl font-bold text-sm transition-all
          ${nota !== null && pedidoId
            ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-[0.98]'
            : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
          }
        `}
      >
        {enviando ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Enviando...
          </span>
        ) : (
          'Enviar Avaliação'
        )}
      </button>
    </div>
  )
}
