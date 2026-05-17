import { useState, useCallback, useMemo } from 'react'
import type { UnifiedPedido } from '../PedidosPage'

export type FiltroData = 'hoje' | 'ontem' | 'semana' | 'mes' | 'personalizado'

export interface UsePedidosFiltersReturn {
  filtroData: FiltroData
  dataInicio: string
  dataFim: string
  showFiltroPersonalizado: boolean
  busca: string
  filteredPedidos: UnifiedPedido[]
  setFiltroData: (filtro: FiltroData) => void
  setDataInicio: (data: string) => void
  setDataFim: (data: string) => void
  setShowFiltroPersonalizado: (show: boolean) => void
  setBusca: (busca: string) => void
  clearFiltros: () => void
  getDateRange: () => { inicio: string; fim: string }
}

export function usePedidosFilters(pedidos: UnifiedPedido[]): UsePedidosFiltersReturn {
  const [filtroData, setFiltroData] = useState<FiltroData>('hoje')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showFiltroPersonalizado, setShowFiltroPersonalizado] = useState(false)
  const [busca, setBusca] = useState('')

  const getDateRange = useCallback(() => {
    const now = new Date()
    let inicio: Date
    let fim: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    switch (filtroData) {
      case 'hoje':
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        break
      case 'ontem':
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0)
        fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)
        break
      case 'semana':
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0)
        break
      case 'mes':
        inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        break
      case 'personalizado':
        inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        fim = dataFim ? new Date(dataFim + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      default:
        inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    }

    return { inicio: inicio.toISOString(), fim: fim.toISOString() }
  }, [filtroData, dataInicio, dataFim])

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(pedido => {
      // Filtro de busca
      if (busca) {
        const buscaLower = busca.toLowerCase()
        const matchNome = pedido.cliente_nome?.toLowerCase().includes(buscaLower)
        const matchTelefone = pedido.cliente_telefone?.includes(buscaLower)
        const matchNumero = pedido.numero.toString().includes(buscaLower)
        
        if (!matchNome && !matchTelefone && !matchNumero) {
          return false
        }
      }

      // Filtro de data é aplicado na query do React Query
      return true
    })
  }, [pedidos, busca])

  const clearFiltros = useCallback(() => {
    setFiltroData('hoje')
    setDataInicio('')
    setDataFim('')
    setBusca('')
    setShowFiltroPersonalizado(false)
  }, [])

  return {
    filtroData,
    dataInicio,
    dataFim,
    showFiltroPersonalizado,
    busca,
    filteredPedidos,
    setFiltroData,
    setDataInicio,
    setDataFim,
    setShowFiltroPersonalizado,
    setBusca,
    clearFiltros,
    getDateRange
  }
}
