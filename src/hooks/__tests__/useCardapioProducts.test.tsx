/**
 * @description Testes para o hook useCardapioProducts
 * @hook useCardapioProducts - Gerenciamento de produtos do cardápio
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCardapioProducts } from '../cardapio/useCardapioProducts'
import { supabase } from '../../lib/supabase'

// Mock do supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock do useRealtime
vi.mock('../useRealtime', () => ({
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

describe('useCardapioProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve retornar estado inicial vazio', () => {
    const { result } = renderHook(() => useCardapioProducts({ tenantId: null }), {
      wrapper: createWrapper(),
    })

    expect(result.current.produtos).toEqual([])
    expect(result.current.precos).toEqual([])
    expect(result.current.produtoPrecos).toEqual({})
  })

  it('deve carregar produtos com sucesso', async () => {
    const mockProdutos = [
      { id: '1', nome: 'Pizza Margherita', preco: 50, tenant_id: 'tenant-1' },
      { id: '2', nome: 'Pizza Calabresa', preco: 55, tenant_id: 'tenant-1' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockProdutos }),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useCardapioProducts({ tenantId: 'tenant-1' }), {
      wrapper: createWrapper(),
    })

    await result.current.fetchProdutos()

    await waitFor(() => {
      expect(result.current.produtos).toHaveLength(2)
    })

    expect(result.current.produtos[0].nome).toBe('Pizza Margherita')
    expect(result.current.produtos[1].nome).toBe('Pizza Calabresa')
  })

  it('deve lidar com erro na requisição de produtos', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Erro ao buscar produtos' } }),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useCardapioProducts({ tenantId: 'tenant-1' }), {
      wrapper: createWrapper(),
    })

    await result.current.fetchProdutos()

    expect(result.current.produtos).toEqual([])
  })

  it('deve buscar precos de um produto especifico', async () => {
    const mockPrecos = [
      { id: '1', produto_id: 'produto-1', tamanho: 'P', preco: 40, tenant_id: 'tenant-1' },
      { id: '2', produto_id: 'produto-1', tamanho: 'G', preco: 60, tenant_id: 'tenant-1' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      mockResolvedValue: vi.fn().mockResolvedValue({ data: mockPrecos }),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useCardapioProducts({ tenantId: 'tenant-1' }), {
      wrapper: createWrapper(),
    })

    await result.current.fetchPrecosDoProduto('produto-1')

    await waitFor(() => {
      expect(result.current.precos).toHaveLength(2)
    })
  })

  it('nao deve buscar produtos sem tenantId', async () => {
    const { result } = renderHook(() => useCardapioProducts({ tenantId: null }), {
      wrapper: createWrapper(),
    })

    await result.current.fetchProdutos()

    expect(supabase.from).not.toHaveBeenCalled()
    expect(result.current.produtos).toEqual([])
  })

  it('deve excluir produto com sucesso', async () => {
    const mockDelete = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      mockResolvedValue: mockDelete,
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useCardapioProducts({ tenantId: 'tenant-1' }), {
      wrapper: createWrapper(),
    })

    await result.current.deleteProduto('produto-1')

    expect(supabase.from).toHaveBeenCalledWith('produtos')
  })

  it('deve adicionar preco por tamanho', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useCardapioProducts({ tenantId: 'tenant-1' }), {
      wrapper: createWrapper(),
    })

    await result.current.addPreco('produto-1', 'M', '45')

    expect(supabase.from).toHaveBeenCalledWith('precos_tamanho')
  })

  it('nao deve adicionar preco sem tamanho ou valor', async () => {
    const { result } = renderHook(() => useCardapioProducts({ tenantId: 'tenant-1' }), {
      wrapper: createWrapper(),
    })

    await result.current.addPreco('produto-1', '', '')

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('deve deletar preco por tamanho', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(() => useCardapioProducts({ tenantId: 'tenant-1' }), {
      wrapper: createWrapper(),
    })

    await result.current.deletePreco('preco-1', 'produto-1')

    expect(supabase.from).toHaveBeenCalledWith('precos_tamanho')
  })

  it('deve retornar todos os precos agrupados por produto', async () => {
    const mockPrecos = [
      { id: '1', produto_id: 'produto-1', tamanho: 'P', preco: 40, tenant_id: 'tenant-1' },
      { id: '2', produto_id: 'produto-1', tamanho: 'G', preco: 60, tenant_id: 'tenant-1' },
      { id: '3', produto_id: 'produto-2', tamanho: 'P', preco: 35, tenant_id: 'tenant-1' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      mockResolvedValue: vi.fn().mockResolvedValue({ data: mockPrecos }),
    } as unknown as ReturnType<typeof supabase.from>)

    const { result } = renderHook(
      () => useCardapioProducts({ tenantId: 'tenant-1' }),
      { wrapper: createWrapper() }
    )

    // Simula a mudança de produtos para trigger do useEffect
    await waitFor(() => {
      expect(result.current.produtoPrecos).toHaveProperty('produto-1')
    })
  })
})
