import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function getTenantId(): string {
  const configStr = localStorage.getItem('supabase.auth.token')
  if (configStr) {
    try {
      const config = JSON.parse(configStr)
      return config.access_token?.user_metadata?.tenant_id || config.user?.user_metadata?.tenant_id || ''
    } catch {
      return ''
    }
  }
  return ''
}

interface Motoboy {
  id: string
  nome: string
  telefone: string
  status: string
  latitude: number | null
  longitude: number | null
}

interface EntregaAtiva {
  id: string
  motoboy_id: string | null
  status: string
  pedido?: {
    numero: number
    cliente_nome: string
    endereco_entrega: string
  }
}

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

const createEstabelecimentoIcon = () => {
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
}

function AnimatedMarkerComponent({ 
  motoboy, 
  entrega
}: { 
  motoboy: Motoboy
  entrega?: EntregaAtiva
}) {
  const markerRef = useRef<L.Marker>(null)
  const animationRef = useRef<number | null>(null)
  // Usar estado para renderização segura
  const [displayPosition, setDisplayPosition] = useState<{ lat: number; lng: number }>({ 
    lat: motoboy.latitude || 0, 
    lng: motoboy.longitude || 0 
  })
  const targetPosition = useRef({ lat: motoboy.latitude || 0, lng: motoboy.longitude || 0 })

  const animateMarker = useCallback(() => {
    if (!markerRef.current) return;

    const target = targetPosition.current
    
    markerRef.current.setLatLng([target.lat, target.lng])
    setDisplayPosition({ ...target })
  }, [])

  useEffect(() => {
    if (motoboy.latitude !== null && motoboy.longitude !== null) {
      const newTarget = { lat: motoboy.latitude, lng: motoboy.longitude }
      
      const latDiff = Math.abs(newTarget.lat - targetPosition.current.lat)
      const lngDiff = Math.abs(newTarget.lng - targetPosition.current.lng)
      
      if (latDiff > 0.00001 || lngDiff > 0.00001) {
        targetPosition.current = newTarget
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
        
        animateMarker()
      }
    }
  }, [motoboy.latitude, motoboy.longitude, animateMarker])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  if (motoboy.latitude === null || motoboy.longitude === null) {
    return null
  }

  return (
    <Marker
      ref={markerRef}
      position={[displayPosition.lat, displayPosition.lng]}
      icon={createMotoboyIcon(motoboy.status)}
    >
      <Popup className="motoboy-popup">
        <div style={{
          padding: '8px',
          minWidth: '200px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: motoboy.status === 'em_entrega' ? '#f57c24' : motoboy.status === 'disponivel' ? '#22c55e' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {motoboy.nome[0]}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a' }}>
                {motoboy.nome}
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: motoboy.status === 'em_entrega' ? '#f57c24' : motoboy.status === 'disponivel' ? '#22c55e' : '#6b7280'
              }}>
                {motoboy.status === 'em_entrega' ? 'Em Entrega' : motoboy.status === 'disponivel' ? 'Disponível' : 'Inativo'}
              </div>
            </div>
          </div>

          {entrega && entrega.pedido && (
            <div style={{
              background: '#f5f5f5',
              padding: '8px',
              borderRadius: '8px',
              marginTop: '4px'
            }}>
              <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                Entregando Pedido
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a' }}>
                #{String(entrega.pedido.numero).padStart(4, '0')}
              </div>
              <div style={{ fontSize: '12px', color: '#333', marginTop: '2px' }}>
                {entrega.pedido.cliente_nome}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ 
                  background: entrega.status === 'coletado' ? '#f57c24' : '#3b82f6',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 'bold'
                }}>
                  {entrega.status === 'coletado' ? 'A CAMINHO' : 'AGUARDANDO'}
                </span>
              </div>
            </div>
          )}

          {!entrega && motoboy.status === 'disponivel' && (
            <div style={{
              background: '#dcfce7',
              padding: '8px',
              borderRadius: '8px',
              marginTop: '4px',
              fontSize: '12px',
              color: '#166534',
              textAlign: 'center'
            }}>
              Livre para entregas
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

function EstabelecimentoMarker({ position }: { position: [number, number] }) {
  return (
    <Marker position={position} icon={createEstabelecimentoIcon()}>
      <Popup>
        <div style={{
          padding: '8px',
          minWidth: '180px',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#ff5637',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
            </svg>
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a' }}>
            Seu Estabelecimento
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Localização atual
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

function MapUpdater({ motoboys, estabelecimentoPos }: { motoboys: Motoboy[], estabelecimentoPos: [number, number] | null }) {
  const map = useMap()

  useEffect(() => {
    const points: [number, number][] = []
    
    // Adicionar posição do estabelecimento
    if (estabelecimentoPos) {
      points.push(estabelecimentoPos)
    }
    
    // Adicionar posições dos motoboys
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

  return null
}

export default function MapaEntregas({ entregasAtivas }: { entregasAtivas: EntregaAtiva[] }) {
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantId()
  const [motoboys, setMotoboys] = useState<Motoboy[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoPos, setEstabelecimentoPos] = useState<[number, number] | null>(null)
  const [localizacaoStatus, setLocalizacaoStatus] = useState<'solicitando' | 'concedida' | 'negada'>('solicitando')
  const center: [number, number] = [-23.5505, -46.6333] // São Paulo como padrão

  // Solicitar geolocalização ao montar o componente
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setEstabelecimentoPos([latitude, longitude])
          setLocalizacaoStatus('concedida')
          // console.log('Localização obtida:', latitude, longitude)
        },
        (error) => {
          console.warn('Erro ao obter localização:', error.message)
          setLocalizacaoStatus('negada')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    } else {
      setLocalizacaoStatus('negada')
    }
  }, [])

  const fetchMotoboys = useCallback(async () => {
    if (!tenantId) {
      console.warn('MapaEntregas: tenantId não disponível, pulando fetch')
      setLoading(false)
      return
    }
    
    console.log('MapaEntregas: Fetching motoboys for tenant:', tenantId)
    const { data, error } = await supabase
      .from('motoboys')
      .select('id, nome, telefone, status, latitude, longitude')
      .eq('tenant_id', tenantId)
      .neq('status', 'inativo')

    if (error) {
      console.error('MapaEntregas: Erro ao buscar motoboys:', error)
    }
    
    if (data) {
      console.log('MapaEntregas: Motoboys encontrados:', data.length)
      setMotoboys(data as Motoboy[])
    }
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchMotoboys()
  }, [fetchMotoboys])

  // Realtime listener para atualização de posição
  useEffect(() => {
    if (!tenantId) {
      console.warn('MapaEntregas: tenantId não disponível para realtime')
      return
    }

    console.log('MapaEntregas: Iniciando subscription realtime para motoboys', tenantId)
    
    const channel = supabase
      .channel(`motoboys-position-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'motoboys',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('MapaEntregas: Recebida atualização de motoboy:', payload.new)
          const updatedMotoboy = payload.new as Motoboy
          setMotoboys(prev => {
            const index = prev.findIndex(m => m.id === updatedMotoboy.id)
            if (index >= 0) {
              const newMotoboys = [...prev]
              newMotoboys[index] = { ...newMotoboys[index], ...updatedMotoboy }
              return newMotoboys
            }
            return prev
          })
        }
      )
      .on('system', { event: 'connection_state_changed' }, (payload) => {
        console.log('MapaEntregas: Estado da conexão mudou:', payload)
      })
      .subscribe((status) => {
        console.log('MapaEntregas: Status da subscription:', status)
        if (status === 'SUBSCRIBED') {
          console.log('MapaEntregas: Subscription ativa!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('MapaEntregas: Erro no canal de realtime')
        } else if (status === 'TIMED_OUT') {
          console.error('MapaEntregas: Timeout na subscription')
        }
      })

    return () => {
      console.log('MapaEntregas: Removendo subscription')
      supabase.removeChannel(channel)
    }
  }, [tenantId])

  const getEntregaForMotoboy = (motoboyId: string) => {
    return entregasAtivas.find(e => e.motoboy_id === motoboyId)
  }

  if (loading) {
    return (
      <div className="h-full bg-surface-container-low rounded-xl flex items-center justify-center border border-outline-variant/10">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full rounded-xl overflow-hidden border border-outline-variant/10 relative">
      <MapContainer
        center={estabelecimentoPos || center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
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
        
        <MapUpdater motoboys={motoboys} estabelecimentoPos={estabelecimentoPos} />

        {/* Marcador do estabelecimento */}
        {estabelecimentoPos && (
          <EstabelecimentoMarker position={estabelecimentoPos} />
        )}

        {/* Marcadores dos motoboys */}
        {motoboys.map(motoboy => (
          <AnimatedMarkerComponent
            key={motoboy.id}
            motoboy={motoboy}
            entrega={getEntregaForMotoboy(motoboy.id)}
          />
        ))}
      </MapContainer>

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-surface-container/90 backdrop-blur-sm rounded-xl p-3 border border-outline-variant/20 z-[1000]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Legenda
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-on-surface">Estabelecimento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-on-surface">Motoboy Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-on-surface">Motoboy em Entrega</span>
          </div>
        </div>
      </div>

      {/* Status da localização e contador */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <div className="bg-surface-container/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">two_wheeler</span>
            <span className="text-sm font-bold text-on-surface">
              {motoboys.filter(m => m.status !== 'inativo').length} motoboys ativos
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
