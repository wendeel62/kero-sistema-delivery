/**
 * @description Testes para o hook usePdv
 * @hook usePdv - Hook principal do PDV (Ponto de Venda)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePdv } from '../usePdv'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../lib/syncCliente', () => ({
  syncCliente: vi.fn(),
}))

vi.mock('../useRealtime', () => ({
  useRealtime: vi.fn(),
}))

vi.mock('../usePdvOffline', () => ({
  usePdvOffline: () => ({
    isOnline: true,
    syncStatus: 'synced',
    savePedidoOffline: vi.fn(),
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

describe('usePdv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve retornar pedidoAtualRef', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.pedidoAtualRef).toBeDefined()
  })

  it('deve retornar dados iniciais vazios', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.produtos).toEqual([])
    expect(result.current.categorias).toEqual([])
    expect(result.current.mesas).toEqual([])
    expect(result.current.sabores).toEqual([])
  })

  it('deve retornar estado do carrinho', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.itens).toEqual([])
    expect(result.current.cartPulse).toBe(false)
    expect(result.current.subtotal).toBe(0)
    expect(result.current.total).toBe(0)
  })

  it('deve retornar filtros', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.filtro).toBeNull()
    expect(result.current.busca).toBe('')
  })

  it('deve retornar tipo de pedido padrao', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.tipo).toBe('balcao')
    expect(result.current.clienteNome).toBe('')
    expect(result.current.clienteTelefone).toBe('')
    expect(result.current.formaPagamento).toBe('dinheiro')
    expect(result.current.desconto).toBe(0)
  })

  it('deve retornar status de salvamento', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.salvando).toBe(false)
    expect(result.current.sucesso).toBe(false)
  })

  it('deve retornar status online', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isOnline).toBe(true)
    expect(result.current.syncStatus).toBe('synced')
  })

  it('deve adicionar item ao carrinho', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    const produto = {
      id: '1',
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: 'tenant-1',
      categoria_id: '',
      descricao: '',
      imagem_url: '',
    }

    act(() => {
      result.current.addItem(produto, {})
    })

    expect(result.current.itens.length).toBeGreaterThan(0)
  })

  it('deve retornar metodos de acao', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.setFiltro).toBe('function')
    expect(typeof result.current.setBusca).toBe('function')
    expect(typeof result.current.setTipo).toBe('function')
    expect(typeof result.current.setClienteNome).toBe('function')
    expect(typeof result.current.setClienteTelefone).toBe('function')
    expect(typeof result.current.setDesconto).toBe('function')
    expect(typeof result.current.setFormaPagamento).toBe('function')
    expect(typeof result.current.salvarPedido).toBe('function')
    expect(typeof result.current.fetchData).toBe('function')
  })

  it('deve retornar status de mesa', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.showOcuparMesa).toBe(false)
    expect(result.current.mesaSelecionada).toBeNull()
    expect(result.current.pessoasMesa).toBe(1)
    expect(result.current.responsavelMesa).toBe('')
    expect(result.current.showDivisaoConta).toBe(false)
  })

  it('deve retornar metodos de controle de mesa', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.setShowOcuparMesa).toBe('function')
    expect(typeof result.current.setMesaSelecionada).toBe('function')
    expect(typeof result.current.setPessoasMesa).toBe('function')
    expect(typeof result.current.setResponsavelMesa).toBe('function')
    expect(typeof result.current.ocuparMesa).toBe('function')
  })

  it('deve retornar metodos de variacoes', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.setShowVariacoesModal).toBe('function')
    expect(typeof result.current.setTamanhoSelecionado).toBe('function')
    expect(typeof result.current.setTipoPizza).toBe('function')
    expect(typeof result.current.setSabor1).toBe('function')
    expect(typeof result.current.setSabor2).toBe('function')
  })

  it('deve retornar status de variacoes modal', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.produtoSelecionado).toBeNull()
    expect(result.current.showVariacoesModal).toBe(false)
    expect(result.current.tamanhoSelecionado).toBe('')
    expect(result.current.tipoPizza).toBe('inteiro')
    expect(result.current.sabor1).toBe('')
    expect(result.current.sabor2).toBe('')
  })

  it('deve retornar tenantId', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(result.current.tenantId).toBeDefined()
  })

  it('deve retornar getStatusColor', () => {
    const { result } = renderHook(() => usePdv(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.getStatusColor).toBe('function')
    expect(result.current.getStatusColor('pendente')).toBe('#ff9800')
    expect(result.current.getStatusColor('preparando')).toBe('#2196f3')
    expect(result.current.getStatusColor('entregue')).toBe('#4caf50')
    expect(result.current.getStatusColor('cancelado')).toBe('#f44336')
  })
})
