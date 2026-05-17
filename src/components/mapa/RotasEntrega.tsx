import { useEffect, useRef, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { MotoboyPosicao } from '../../types'

interface RotasEntregaProps {
  motoboys: MotoboyPosicao[]
  estabelecimentoPos: [number, number] | null
  mostrarRotas: boolean
}

/**
 * Componente que gerencia rotas e trajetórias no mapa
 * Responsável por desenhar linhas de trajetória entre motoboys e estabelecimento
 */
export const RotasEntrega: React.FC<RotasEntregaProps> = ({
  motoboys,
  estabelecimentoPos,
  mostrarRotas
}) => {
  const map = useMap()
  const polylineRef = useRef<L.Polyline | null>(null)

  // Atualiza o mapa para mostrar todos os pontos
  useEffect(() => {
    const points: [number, number][] = []

    // Adiciona posição do estabelecimento
    if (estabelecimentoPos) {
      points.push(estabelecimentoPos)
    }

    // Adiciona posições dos motoboys
    motoboys.forEach(m => {
      if (m.latitude !== null && m.longitude !== null) {
        points.push([m.latitude, m.longitude])
      }
    })

    if (points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 15)
      } else {
        const bounds = L.latLngBounds(points)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      }
    }
  }, [motoboys, estabelecimentoPos, map])

  // Desenha rotas entre motoboys e estabelecimento
  useEffect(() => {
    if (!mostrarRotas || !estabelecimentoPos) {
      polylineRef.current?.remove()
      polylineRef.current = null
      return
    }

    // Cria linhas de conexão entre motoboys em entrega e o estabelecimento
    const linhas: [number, number][] = []

    motoboys.forEach(motoboy => {
      if (
        motoboy.status === 'em_entrega' &&
        motoboy.latitude !== null &&
        motoboy.longitude !== null
      ) {
        // Linha do estabelecimento até o motoboy
        linhas.push(estabelecimentoPos)
        linhas.push([motoboy.latitude, motoboy.longitude])
      }
    })

    if (linhas.length > 0 && polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }

    if (linhas.length > 0) {
      const polyline = L.polyline(linhas, {
        color: '#f57c24',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
        lineCap: 'round' as const
      })

      polyline.addTo(map)
      polylineRef.current = polyline
    }

    return () => {
      polylineRef.current?.remove()
    }
  }, [motoboys, estabelecimentoPos, mostrarRotas, map])

  return null
}

/**
 * Componente de marcador do estabelecimento
 */
interface EstabelecimentoMarkerProps {
  position: [number, number]
}

export const EstabelecimentoMarker: React.FC<EstabelecimentoMarkerProps> = ({ position }) => {
  const createIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-estabelecimento-marker',
      html: `
        <div style="
          position: relative;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 50px;
            height: 50px;
            background: #ff5637;
            border-radius: 50%;
            opacity: 0.2;
            animation: pulse-establishment 2s ease-out infinite;
          "></div>
          <div style="
            position: relative;
            width: 44px;
            height: 44px;
            background: #ff5637;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(255,86,55,0.5);
            border: 3px solid white;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
            </svg>
          </div>
        </div>
        <style>
          @keyframes pulse-establishment {
            0% { transform: scale(0.8); opacity: 0.4; }
            50% { transform: scale(1.3); opacity: 0.1; }
            100% { transform: scale(0.8); opacity: 0.4; }
          }
        </style>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25],
    })
  }, [])

  return (
    <Marker position={position} icon={createIcon}>
      <Popup>
        <div style={styles.popup}>
          <div style={styles.icon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
            </svg>
          </div>
          <div style={styles.title}>Seu Estabelecimento</div>
          <div style={styles.subtitle}>Localização atual</div>
        </div>
      </Popup>
    </Marker>
  )
}

import { Marker, Popup } from 'react-leaflet'

const styles: Record<string, React.CSSProperties> = {
  popup: {
    padding: '8px',
    minWidth: '180px',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center'
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#ff5637',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 8px'
  },
  title: {
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#1a1a1a'
  },
  subtitle: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px'
  }
}

export default RotasEntrega
