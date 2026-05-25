/**
 * MapaEntregas.tsx
 * Componente legado - redireciona para MapaContainer
 * Este arquivo foi mantido para compatibilidade
 */
import { MapaContainer } from './mapa/MapaContainer'
import type { EntregaAtiva } from '../types'

interface MapaEntregasProps {
  entregasAtivas: EntregaAtiva[]
}

/**
 * @deprecated Use MapaContainer diretamente
 * Este componente foi mantido para compatibilidade com código legado
 */
export default function MapaEntregas({ entregasAtivas }: MapaEntregasProps) {
  return <MapaContainer entregasAtivas={entregasAtivas} />
}
