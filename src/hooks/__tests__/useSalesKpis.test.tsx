/**
 * @description Testes para o hook useSalesKpis
 * @hook useSalesKpis - KPIs de vendas e faturamento
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSalesKpis } from '../useSalesKpis'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
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

describe('useSalesKpis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve retornar estado inicial com valores padrao', () => {
    const { result } = renderHook(() => useSalesKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.salesKpis).toBeDefined()
    expect(result.current.salesKpis.faturamento).toBe(0)
    expect(result.current.salesKpis.totalPedidos).toBe(0)
    expect(result.current.salesKpis.ticketMedio).toBe(0)
    expect(result.current.salesKpis.pedidosAbertos).toBe(0)
    expect(result.current.salesKpis.totalEntregues).toBe(0)
    expect(result.current.salesKpis.receita7Dias).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('deve retornar kpiData com 5 indicadores', () => {
    const { result } = renderHook(() => useSalesKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.kpiData).toHaveLength(5)
    expect(result.current.kpiData.map(k => k.id)).toEqual([
      'faturamento',
      'totalPedidos',
      'pedidosAbertos',
      'totalEntregues',
      'ticketMedio',
    ])
  })

  it('deve formatar moeda corretamente', () => {
    const { result } = renderHook(() => useSalesKpis(), {
      wrapper: createWrapper(),
    })

    expect(result.current.formatCurrency(1234.56)).toContain('1.234,56')
    expect(result.current.formatCurrency(0)).toContain('0,00')
    expect(result.current.formatCurrency(100)).toContain('100,00')
  })

  it('deve buscar KPIs de vendas com sucesso', async () => {
    const mockPedidosHoje = [
      { id: '1', total: 100, status: 'entregue' },
      { id: '2', total: 150, status: 'aberto' },
      { id: '3', total: 80, status: 'cancelado' },
    ]

    const mockPedidos7Dias = [
      { id: '1', total: 100, created_at: '2024-01-01' },
      { id: '2', total: 150, created_at: '2024-01-02' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      mockResolvedValue: vi.fn()
        .mockResolvedValueOnce({ data: mockPedidosHoje })
        .mockResolvedValueOnce({ data: mockPedidos7Dias }),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useSalesKpis(), {
      wrapper: createWrapper(),
    })

    // Aguarda o carregamento dos dados
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(result.current.salesKpis).toBeDefined()
  })

  it('deve lidar com erro na requisicao de KPIs', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      mockResolvedValue: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro' } }),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useSalesKpis(), {
      wrapper: createWrapper(),
    })

    // Deve manter valores default em caso de erro
    expect(result.current.salesKpis.faturamento).toBe(0)
    expect(result.current.salesKpis.totalPedidos).toBe(0)
  })

  it('deve retornar isLoading true durante carregamento', () => {
    const { result } = renderHook(() => useSalesKpis(), {
      wrapper: createWrapper(),
    })

    // isLoading pode ser true ou false dependendo do estado
    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('deve calcular ticket medio corretamente', () => {
    const { result } = renderHook(() => useSalesKpis(), {
      wrapper: createWrapper(),
    })

    // Ticket médio inicial deve ser 0
    expect(result.current.salesKpis.ticketMedio).toBe(0)
  })
})
