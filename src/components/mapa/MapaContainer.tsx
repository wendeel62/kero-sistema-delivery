import { useMemo, useState, useCallback } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { EntregaAtiva, FiltroMapa as FiltroMapaType } from '../../types'
import { useMapaEntregas } from './useMapaEntregas'
import { EntregaMarkers } from './EntregaMarkers'
import { RotasEntrega, EstabelecimentoMarker } from './RotasEntrega'
import { FiltrosMapa } from './FiltrosMapa'

interface MapaContainerProps {
  entregasAtivas: EntregaAtiva[]
  className?: string
}

/**
 * Container principal do Mapa de Entregas
 * Gerencia estado dos filtros e renderização do mapa
 */
export const MapaContainer: React.FC<MapaContainerProps> = ({
  entregasAtivas,
  className = ''
}) => {
  // Estado dos filtros
  const [filtros, setFiltros] = useState<FiltroMapaType>({
    mostrarDisponiveis: true,
    mostrarEmEntrega: true,
    mostrarInativos: false
  })

  // Hook de dados do mapa
  const {
    motoboys,
    loading,
    estabelecimentoPos,
    localizacaoStatus,
    getEntregaForMotoboy
  } = useMapaEntregas(entregasAtivas)

  // Ponto central padrão (São Paulo)
  const center: [number, number] = [-23.5505, -46.6333]

  // Contagem de motoboys
  const motoboysCount = useMemo(() => {
    return motoboys.filter(m => m.status !== 'inativo').length
  }, [motoboys])

  // Toggle de filtros
  const handleToggleFiltro = useCallback((novosFiltros: FiltroMapaType) => {
    setFiltros(novosFiltros)
  }, [])

  if (loading) {
    return (
      <div className={`h-full bg-surface-container-low rounded-xl flex items-center justify-center border border-outline-variant/10 ${className}`}>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`h-full rounded-xl overflow-hidden border border-outline-variant/10 relative ${className}`}>
      <MapContainer
        center={estabelecimentoPos || center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* Camada de mapa (Google Maps ou OpenStreetMap) */}
        {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
          <TileLayer
            attribution='&copy; Google Maps'
            url={`https://maps.googleapis.com/maps/vt?lyrs=m&x={x}&y={y}&z={z}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* Marcador do estabelecimento */}
        {estabelecimentoPos && (
          <EstabelecimentoMarker position={estabelecimentoPos} />
        )}

        {/* Markers dos motoboys */}
        <EntregaMarkers
          motoboys={motoboys}
          entregasAtivas={entregasAtivas}
          getEntregaForMotoboy={getEntregaForMotoboy}
          filtros={{
            mostrarDisponiveis: filtros.mostrarDisponiveis,
            mostrarEmEntrega: filtros.mostrarEmEntrega
          }}
        />

        {/* Rotas e trajetórias */}
        <RotasEntrega
          motoboys={motoboys}
          estabelecimentoPos={estabelecimentoPos}
          mostrarRotas={true}
        />
      </MapContainer>

      {/* Filtros de visualização */}
      <FiltrosMapa
        filtros={filtros}
        setFiltros={handleToggleFiltro}
        motoboys={motoboys}
      />

      {/* Status da localização e contador */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <div className="bg-surface-container/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">two_wheeler</span>
            <span className="text-sm font-bold text-on-surface">
              {motoboysCount} motoboys ativos
            </span>
          </div>
        </div>

        {localizacaoStatus === 'solicitando' && (
          <div className="bg-surface-container/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-outline-variant/20">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-on-surface-variant">Obtendo localização...</span>
            </div>
          </div>
        )}

        {localizacaoStatus === 'concedida' && estabelecimentoPos && (
          <div className="bg-green-500/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-green-500/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-lg">location_on</span>
              <span className="text-xs text-green-500 font-medium">GPS Ativo</span>
            </div>
          </div>
        )}

        {localizacaoStatus === 'negada' && (
          <div className="bg-orange-500/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500 text-lg">location_off</span>
              <span className="text-xs text-orange-500 font-medium">GPS Indisponível</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapaContainer
