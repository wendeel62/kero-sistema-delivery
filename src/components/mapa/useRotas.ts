import { useState, useCallback } from 'react'
import L from 'leaflet'

/**
 * Ponto de rota para traçar trajetórias
 */
export interface RotaPonto {
  lat: number
  lng: number
}

/**
 * Rota completa com origem, destino e trajetória
 */
export interface Rota {
  origem: RotaPonto
  destino: RotaPonto
  distancia: number
  duracao: number
  polyline?: L.Polyline
}

/**
 * Hook para cálculo de rotas usando APIs externas
 * Suporta Google Maps Directions API e OpenRouteService
 */
export function useRotas() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Calcula rota usando Google Maps Directions API
   */
  const calcularRotaGoogle = useCallback(async (
    origem: [number, number],
    destino: [number, number]
  ): Promise<Rota | null> => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('API key do Google Maps não configurada')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origem[0]},${origem[1]}&destination=${destino[0]},${destino[1]}&key=${apiKey}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'OK' && data.routes?.[0]) {
        const route = data.routes[0]
        const leg = route.legs[0]
        
        // Extrair polyline da rota
        const points = decodePolyline(route.overview_polyline?.points || '')
        
        return {
          origem: { lat: origem[0], lng: origem[1] },
          destino: { lat: destino[0], lng: destino[1] },
          distancia: leg.distance?.value || 0,
          duracao: leg.duration?.value || 0,
          polyline: undefined // Será criado quando renderizar
        }
      }

      setError(data.status === 'ZERO_RESULTS' ? 'Nenhuma rota encontrada' : 'Erro ao calcular rota')
      return null
    } catch (err) {
      setError('Erro ao calcular rota: ' + (err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Calcula rota usando OpenRouteService (alternativa open-source)
   */
  const calcularRotaOpenRoute = useCallback(async (
    origem: [number, number],
    destino: [number, number]
  ): Promise<Rota | null> => {
    const apiKey = import.meta.env.VITE_OPENROUTE_API_KEY
    if (!apiKey) {
      setError('API key do OpenRouteService não configurada')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({
          coordinates: [
            [origem[1], origem[0]], // OpenRoute usa [lng, lat]
            [destino[1], destino[0]]
          ]
        })
      })

      const data = await response.json()

      if (data.features?.[0]) {
        const feature = data.features[0]
        const coordinates = feature.geometry?.coordinates || []
        
        return {
          origem: { lat: origem[0], lng: origem[1] },
          destino: { lat: destino[0], lng: destino[1] },
          distancia: feature.properties?.segments?.[0]?.distance || 0,
          duracao: feature.properties?.segments?.[0]?.duration || 0
        }
      }

      setError('Nenhuma rota encontrada')
      return null
    } catch (err) {
      setError('Erro ao calcular rota: ' + (err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Calcula rota em linha reta (alternativa sem API)
   */
  const calcularRotaSimples = useCallback((
    origem: [number, number],
    destino: [number, number]
  ): Rota => {
    const distancia = calcularDistanciaHaversine(origem, destino)
    
    return {
      origem: { lat: origem[0], lng: origem[1] },
      destino: { lat: destino[0], lng: destino[1] },
      distancia,
      duracao: distancia / 10 // Estimativa grosseira
    }
  }, [])

  /**
   * Limpa erro
   */
  const limparErro = useCallback(() => {
    setError(null)
  }, [])

  return {
    calcularRotaGoogle,
    calcularRotaOpenRoute,
    calcularRotaSimples,
    loading,
    error,
    limparErro
  }
}

/**
 * Decodifica polyline do Google Maps
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b & 0x20)

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1)
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b & 0x20)

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1)
    lng += dlng

    points.push([lat / 1e5, lng / 1e5])
  }

  return points
}

/**
 * Calcula distância entre dois pontos usando fórmula Haversine
 * Retorna distância em metros
 */
function calcularDistanciaHaversine(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371e3 // Raio da Terra em metros
  const φ1 = coord1[0] * Math.PI / 180
  const φ2 = coord2[0] * Math.PI / 180
  const Δφ = (coord2[0] - coord1[0]) * Math.PI / 180
  const Δλ = (coord2[1] - coord1[1]) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
