/**
 * @description Testes para o hook useDashboardKpis
 * @hook useDashboardKpis - Hook combinador de KPIs do dashboard
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDashboardKpis } from '../useDashboardKpis'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../lib/getTenantId', () => ({
  getTenantIdSafe: () => 'tenant-1',
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      user_metadata: {
        tenant_id: 'tenant-1',
      },
    },
  }),
}))

vi.mock('../hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useDashboardKpis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve retornar tenantId', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.tenantId).toBeDefined()
  })

  it('deve retornar kpis combinados', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.kpis).toBeDefined()
    expect(result.current.kpis.faturamento).toBe(0)
    expect(result.current.kpis.totalPedidos).toBe(0)
    expect(result.current.kpis.ticketMedio).toBe(0)
    expect(result.current.kpis.visualizacoes).toBe(0)
    expect(result.current.kpis.avaliacao).toBe(0)
    expect(result.current.kpis.receita7Dias).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('deve retornar salesKpis', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.salesKpis).toBeDefined()
    expect(result.current.salesKpis.faturamento).toBe(0)
    expect(result.current.salesKpis.totalPedidos).toBe(0)
  })

  it('deve retornar customerKpis', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.customerKpis).toBeDefined()
    expect(result.current.customerKpis.visualizacoes).toBe(0)
    expect(result.current.customerKpis.avaliacao).toBe(0)
  })

  it('deve retornar productKpis', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.productKpis).toBeDefined()
    expect(result.current.productKpis.topProdutos).toEqual([])
  })

  it('deve retornar deliveryKpis', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.deliveryKpis).toBeDefined()
    expect(result.current.deliveryKpis.tempoEntrega).toBe(0)
    expect(result.current.deliveryKpis.temposMedios).toEqual({
      novo: 0,
      preparo: 0,
      entrega: 0,
      total: 0,
    })
  })

  it('deve retornar financialKpis', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.financialKpis).toBeDefined()
    expect(result.current.financialKpis.receita7Dias).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('deve retornar kpiData para cards', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.kpiData).toBeInstanceOf(Array)
  })

  it('deve retornar funilData', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.funnelData).toBeDefined()
    expect(result.current.funnelData.visualizacoes).toBe(0)
    expect(result.current.funnelData.addCarrinho).toBe(0)
    expect(result.current.funnelData.checkoutIniciado).toBe(0)
    expect(result.current.funnelData.compras).toBe(0)
  })

  it('deve retornar receitaData', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.receitaData).toBeDefined()
    expect(result.current.receitaData).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('deve retornar metodos de controle de receita', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.receitaDias).toBe(7)
    expect(typeof result.current.setReceitaDias).toBe('function')
  })

  it('deve retornar status de carregamento', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('deve retornar formatCurrency', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.formatCurrency).toBe('function')
    expect(result.current.formatCurrency(1234.56)).toBe('R$ 1.234,56')
  })

  it('deve retornar metodos de controle de funil', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.funilSelecionado).toBe('todas')
    expect(typeof result.current.setFunilSelecionado).toBe('function')
    expect(typeof result.current.showFunilDropdown).toBe('boolean')
    expect(typeof result.current.setShowFunilDropdown).toBe('function')
  })

  it('deve retornar metodos de controle de loja', () => {
    const { result } = renderHook(() => useDashboardKpis(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.lojaAberta).toBe('boolean')
    expect(typeof result.current.toggleLoja).toBe('function')
    expect(typeof result.current.linkCardapio).toBe('string')
  })
})
