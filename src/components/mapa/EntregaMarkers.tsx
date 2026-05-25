import { useMemo, useRef } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { MotoboyPosicao, EntregaAtiva } from '../../types'
import { EntregaPopupContent } from './EntregaPopup'

interface EntregaMarkersProps {
  motoboys: MotoboyPosicao[]
  entregasAtivas: EntregaAtiva[]
  getEntregaForMotoboy: (motoboyId: string) => EntregaAtiva | undefined
  filtros: {
    mostrarDisponiveis: boolean
    mostrarEmEntrega: boolean
  }
}

/**
 * Ícone personalizado para motoboys
 * Memoizado para performance
 */
const createMotoboyIcon = (status: string) => {
  const color = status === 'em_entrega' ? '#f57c24' : status === 'disponivel' ? '#22c55e' : '#6b7280'

  return L.divIcon({
    className: 'custom-motoboy-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background: ${color};
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse-ring 2s ease-out infinite;
        "></div>
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          background: ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          border: 3px solid white;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M19 7c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2V9c0-1.1-.9-2-2-2zm-2 4v-1.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h-1v2h1v1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V13h1v-2h-1zm-6 1c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v3zm-2-3H7v3h4V9zm-5 5c0 1.1.9 2 2 2h2v-2H6v0zm6-6h2v2h-2V8z"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.2; }
          100% { transform: scale(0.8); opacity: 0.6; }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })
}

/**
 * Componente do Marker individual
 * Memoizado para evitar re-renders desnecessários
 */
const MotoboyMarker = ({
  motoboy,
  entrega
}: {
  motoboy: MotoboyPosicao
  entrega?: EntregaAtiva
}) => {
  const markerRef = useRef<L.Marker>(null)

  if (motoboy.latitude === null || motoboy.longitude === null) {
    return null
  }

  return (
    <Marker
      ref={markerRef}
      position={[motoboy.latitude, motoboy.longitude]}
      icon={createMotoboyIcon(motoboy.status)}
    >
      <Popup>
        <EntregaPopupContent
          motoboyNome={motoboy.nome}
          motoboyStatus={motoboy.status}
          entrega={entrega}
        />
      </Popup>
    </Marker>
  )
}

/**
 * Componente de Markers de Entregas
 * Gerencia exibição dos motoboys no mapa com clustering opcional
 */
export const EntregaMarkers: React.FC<EntregaMarkersProps> = ({
  motoboys,
  entregasAtivas: _entregasAtivas,
  getEntregaForMotoboy,
  filtros
}) => {
  // Filtra motoboys por status
  const motoboysFiltrados = useMemo(() => {
    return motoboys.filter(motoboy => {
      if (motoboy.status === 'disponivel') return filtros.mostrarDisponiveis
      if (motoboy.status === 'em_entrega') return filtros.mostrarEmEntrega
      return false
    })
  }, [motoboys, filtros])

  // Memoiza cada marker para performance
  const markers = useMemo(() => {
    return motoboysFiltrados.map((motoboy) => ({
      id: motoboy.id,
      motoboy,
      entrega: getEntregaForMotoboy(motoboy.id)
    }))
  }, [motoboysFiltrados, getEntregaForMotoboy])

  return (
    <>
      {markers.map(({ motoboy, entrega }) => (
        <MotoboyMarker
          key={motoboy.id}
          motoboy={motoboy}
          entrega={entrega}
        />
      ))}
    </>
  )
}

export default EntregaMarkers
