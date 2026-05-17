import { useMemo, useCallback } from 'react'
import type { MotoboyPosicao, FiltroMapa as FiltroMapaType } from '../../types'

interface FiltrosMapaProps {
  filtros: FiltroMapaType
  setFiltros: (filtros: FiltroMapaType) => void
  motoboys: MotoboyPosicao[]
}

/**
 * Componente de Filtros do Mapa
 * Permite filtrar visualização de motoboys por status
 */
export const FiltrosMapa: React.FC<FiltrosMapaProps> = ({
  filtros,
  setFiltros,
  motoboys
}) => {
  // Contagens por status
  const contagens = useMemo(() => ({
    disponiveis: motoboys.filter(m => m.status === 'disponivel').length,
    emEntrega: motoboys.filter(m => m.status === 'em_entrega').length,
    inativos: motoboys.filter(m => m.status === 'inativo').length,
    total: motoboys.length
  }), [motoboys])

  // Handlers otimizadas
  const handleToggleDisponiveis = useCallback(() => {
    setFiltros({ ...filtros, mostrarDisponiveis: !filtros.mostrarDisponiveis })
  }, [filtros, setFiltros])

  const handleToggleEmEntrega = useCallback(() => {
    setFiltros({ ...filtros, mostrarEmEntrega: !filtros.mostrarEmEntrega })
  }, [filtros, setFiltros])

  return (
    <div style={styles.container}>
      <div style={styles.legenda}>
        <div style={styles.titulo}>Legenda</div>
        <div style={styles.itens}>
          <div style={styles.item}>
            <div style={{ ...styles.bola, background: '#ff5637' }} />
            <span style={styles.texto}>Estabelecimento</span>
          </div>
          <div style={styles.item}>
            <div style={{ ...styles.bola, background: '#22c55e' }} />
            <span style={styles.texto}>Disponível ({contagens.disponiveis})</span>
          </div>
          <div style={styles.item}>
            <div style={{ ...styles.bola, background: '#f57c24' }} />
            <span style={styles.texto}>Em Entrega ({contagens.emEntrega})</span>
          </div>
        </div>
      </div>

      <div style={styles.filtros}>
        <button
          onClick={handleToggleDisponiveis}
          style={{
            ...styles.botao,
            opacity: filtros.mostrarDisponiveis ? 1 : 0.6
          }}
        >
          <div style={{ ...styles.indicador, background: '#22c55e' }} />
          <span>Disponíveis</span>
          <span style={styles.contador}>{contagens.disponiveis}</span>
        </button>

        <button
          onClick={handleToggleEmEntrega}
          style={{
            ...styles.botao,
            opacity: filtros.mostrarEmEntrega ? 1 : 0.6
          }}
        >
          <div style={{ ...styles.indicador, background: '#f57c24' }} />
          <span>Em Entrega</span>
          <span style={styles.contador}>{contagens.emEntrega}</span>
        </button>
      </div>
    </div>
  )
}

export default FiltrosMapa

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  legenda: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    padding: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  titulo: {
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  itens: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  bola: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  texto: {
    fontSize: '12px',
    color: '#374151'
  },
  filtros: {
    display: 'flex',
    gap: '8px'
  },
  botao: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: 'white',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  indicador: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  contador: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#6b7280'
  }
}
