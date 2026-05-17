/**
 * @description Testes para o hook usePdvState
 * @hook usePdvState - Gerenciamento de estado do PDV
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePdvState } from '../usePdvState'
import type { Produto, PrecoTamanho } from '../usePdv'

describe('usePdvState', () => {
  it('deve retornar estado inicial correto para carrinho', () => {
    const { result } = renderHook(() => usePdvState())

    expect(result.current.itens).toEqual([])
    expect(result.current.cartPulse).toBe(false)
    expect(result.current.produtos).toEqual([])
    expect(result.current.categorias).toEqual([])
    expect(result.current.mesas).toEqual([])
    expect(result.current.sabores).toEqual([])
  })

  it('deve retornar estado inicial para variacoes modal', () => {
    const { result } = renderHook(() => usePdvState())

    expect(result.current.produtoSelecionado).toBeNull()
    expect(result.current.showVariacoesModal).toBe(false)
    expect(result.current.tamanhoSelecionado).toBe('')
    expect(result.current.tipoPizza).toBe('inteiro')
    expect(result.current.sabor1).toBe('')
    expect(result.current.sabor2).toBe('')
  })

  it('deve retornar estado inicial para filtros', () => {
    const { result } = renderHook(() => usePdvState())

    expect(result.current.filtro).toBeNull()
    expect(result.current.busca).toBe('')
  })

  it('deve retornar estado inicial para mesa', () => {
    const { result } = renderHook(() => usePdvState())

    expect(result.current.showOcuparMesa).toBe(false)
    expect(result.current.mesaSelecionada).toBeNull()
    expect(result.current.pessoasMesa).toBe(1)
    expect(result.current.responsavelMesa).toBe('')
    expect(result.current.showDivisaoConta).toBe(false)
    expect(result.current.itensMesa).toEqual([])
    expect(result.current.mesaFechar).toBeNull()
    expect(result.current.showMesasPanel).toBe(false)
    expect(result.current.mesasComItens).toEqual({})
    expect(result.current.mesaExpandida).toBeNull()
  })

  it('deve retornar estado inicial para pedido', () => {
    const { result } = renderHook(() => usePdvState())

    expect(result.current.tipo).toBe('balcao')
    expect(result.current.clienteNome).toBe('')
    expect(result.current.clienteTelefone).toBe('')
    expect(result.current.mesaNumero).toBe('')
    expect(result.current.observacoes).toBe('')
    expect(result.current.formaPagamento).toBe('dinheiro')
    expect(result.current.desconto).toBe(0)
    expect(result.current.enderecoEntrega).toBe('')
    expect(result.current.salvando).toBe(false)
    expect(result.current.sucesso).toBe(false)
    expect(result.current.pedidoMesaSalvo).toBe(false)
    expect(result.current.mesaDosPedido).toBeNull()
  })

  it('deve adicionar item ao carrinho', () => {
    const { result } = renderHook(() => usePdvState())

    const produto: Produto = {
      id: '1',
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: 'tenant-1',
    }

    act(() => {
      result.current.addToCart(produto, 50)
    })

    expect(result.current.itens).toHaveLength(1)
    expect(result.current.itens[0].produto.id).toBe('1')
    expect(result.current.itens[0].quantidade).toBe(1)
  })

  it('deve incrementar quantidade ao adicionar mesmo item', () => {
    const { result } = renderHook(() => usePdvState())

    const produto: Produto = {
      id: '1',
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: 'tenant-1',
    }

    act(() => {
      result.current.addToCart(produto, 50)
      result.current.addToCart(produto, 50)
    })

    expect(result.current.itens).toHaveLength(1)
    expect(result.current.itens[0].quantidade).toBe(2)
  })

  it('deve remover item do carrinho', () => {
    const { result } = renderHook(() => usePdvState())

    const produto: Produto = {
      id: '1',
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: 'tenant-1',
    }

    act(() => {
      result.current.addToCart(produto, 50)
      result.current.addToCart(produto, 50)
    })

    act(() => {
      result.current.removeItem('1')
    })

    expect(result.current.itens).toHaveLength(1)
    expect(result.current.itens[0].quantidade).toBe(1)

    act(() => {
      result.current.removeItem('1')
    })

    expect(result.current.itens).toHaveLength(0)
  })

  it('deve limpar carrinho', () => {
    const { result } = renderHook(() => usePdvState())

    const produto: Produto = {
      id: '1',
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: 'tenant-1',
    }

    act(() => {
      result.current.addToCart(produto, 50)
    })

    act(() => {
      result.current.clearCart()
    })

    expect(result.current.itens).toHaveLength(0)
  })

  it('deve abrir modal de variacoes para produto com precos', () => {
    const { result } = renderHook(() => usePdvState())

    const produto: Produto = {
      id: '1',
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: 'tenant-1',
    }

    const precosTamanho: Record<string, PrecoTamanho[]> = {
      '1': [
        { id: '1', produto_id: '1', tamanho: 'P', preco: 40, tenant_id: 'tenant-1' },
        { id: '2', produto_id: '1', tamanho: 'G', preco: 60, tenant_id: 'tenant-1' },
      ],
    }

    act(() => {
      result.current.addItem(produto, precosTamanho)
    })

    expect(result.current.showVariacoesModal).toBe(true)
    expect(result.current.produtoSelecionado).toBe(produto)
  })

  it('deve atualizar filtros', () => {
    const { result } = renderHook(() => usePdvState())

    act(() => {
      result.current.setFiltro('pizza')
      result.current.setBusca('margherita')
    })

    expect(result.current.filtro).toBe('pizza')
    expect(result.current.busca).toBe('margherita')
  })

  it('deve atualizar estado do pedido', () => {
    const { result } = renderHook(() => usePdvState())

    act(() => {
      result.current.setTipo('entrega')
      result.current.setClienteNome('João Silva')
      result.current.setClienteTelefone('11999999999')
      result.current.setMesaNumero('1')
      result.current.setObservacoes('Sem cebola')
      result.current.setFormaPagamento('cartao')
      result.current.setDesconto(10)
      result.current.setEnderecoEntrega('Rua das Flores, 123')
    })

    expect(result.current.tipo).toBe('entrega')
    expect(result.current.clienteNome).toBe('João Silva')
    expect(result.current.clienteTelefone).toBe('11999999999')
    expect(result.current.mesaNumero).toBe('1')
    expect(result.current.observacoes).toBe('Sem cebola')
    expect(result.current.formaPagamento).toBe('cartao')
    expect(result.current.desconto).toBe(10)
    expect(result.current.enderecoEntrega).toBe('Rua das Flores, 123')
  })

  it('deve atualizar estado da mesa', () => {
    const { result } = renderHook(() => usePdvState())

    const mesa = {
      id: '1',
      numero: 1,
      capacidade: 4,
      status: 'livre',
      responsavel: '',
      pessoas: 0,
      aberta_em: '',
    }

    act(() => {
      result.current.setMesaSelecionada(mesa)
      result.current.setPessoasMesa(3)
      result.current.setResponsavelMesa('João')
    })

    expect(result.current.mesaSelecionada).toBe(mesa)
    expect(result.current.pessoasMesa).toBe(3)
    expect(result.current.responsavelMesa).toBe('João')
  })

  it('deve acionar cartPulse ao adicionar item', () => {
    const { result } = renderHook(() => usePdvState())

    const produto: Produto = {
      id: '1',
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: 'tenant-1',
    }

    act(() => {
      result.current.addToCart(produto, 50)
    })

    // cartPulse deve ser true imediatamente apos adicionar
    expect(result.current.cartPulse).toBe(true)
  })
})
