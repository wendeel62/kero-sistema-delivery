import { useState, useCallback, useEffect } from 'react'
import type { Produto } from './types'

export interface CartItem {
  produto: Produto
  quantidade: number
  tamanho?: string
  precoUnitario: number
  tipoPizza?: 'inteiro' | 'meio-a-meio'
  sabor1?: string
  sabor2?: string
}

export interface UseCarrinhoReturn {
  cart: CartItem[]
  subtotal: number
  total: number
  taxaEntrega: number
  cartCount: number
  addToCart: (produto: Produto, preco: number, tamanho?: string, tipoPizza?: 'inteiro' | 'meio-a-meio', sabor1?: string, sabor2?: string) => void
  removeFromCart: (id: string, tamanho?: string, tipoPizza?: string, sabor1?: string, sabor2?: string) => void
  updateQuantity: (id: string, tamanho: string | undefined, tipoPizza: string | undefined, sabor1: string | undefined, sabor2: string | undefined, quantidade: number) => void
  clearCart: () => void
  setTaxaEntrega: (taxa: number) => void
}

export function useCarrinho(taxaEntregaInicial = 0): UseCarrinhoReturn {
  const [cart, setCart] = useState<CartItem[]>([])
  const [taxaEntrega, setTaxaEntrega] = useState(taxaEntregaInicial)

  // Persistir carrinho no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kero_cart')
      if (saved) {
        const parsed = JSON.parse(saved)
        setCart(parsed)
      }
    } catch {
      // localStorage indisponível
    }
  }, [])

  // Salvar carrinho no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kero_cart', JSON.stringify(cart))
    } catch {
      // localStorage indisponível
    }
  }, [cart])

  const addToCart = useCallback((
    produto: Produto,
    preco: number,
    tamanho?: string,
    tipoPizza: 'inteiro' | 'meio-a-meio' = 'inteiro',
    sabor1?: string,
    sabor2?: string
  ) => {
    setCart(prev => {
      const existing = prev.find(item =>
        item.produto.id === produto.id &&
        item.tamanho === tamanho &&
        item.tipoPizza === tipoPizza &&
        item.sabor1 === sabor1 &&
        item.sabor2 === sabor2
      )

      if (existing) {
        return prev.map(item =>
          item.produto.id === produto.id &&
          item.tamanho === tamanho &&
          item.tipoPizza === tipoPizza &&
          item.sabor1 === sabor1 &&
          item.sabor2 === sabor2
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      }

      return [
        ...prev,
        {
          produto,
          quantidade: 1,
          tamanho,
          precoUnitario: preco,
          tipoPizza,
          sabor1,
          sabor2
        }
      ]
    })
  }, [])

  const removeFromCart = useCallback((
    id: string,
    tamanho?: string,
    tipoPizza?: string,
    sabor1?: string,
    sabor2?: string
  ) => {
    setCart(prev =>
      prev
        .map(item =>
          item.produto.id === id &&
          item.tamanho === tamanho &&
          item.tipoPizza === tipoPizza &&
          item.sabor1 === sabor1 &&
          item.sabor2 === sabor2
            ? { ...item, quantidade: item.quantidade - 1 }
            : item
        )
        .filter(item => item.quantidade > 0)
    )
  }, [])

  const updateQuantity = useCallback((
    id: string,
    tamanho: string | undefined,
    tipoPizza: string | undefined,
    sabor1: string | undefined,
    sabor2: string | undefined,
    quantidade: number
  ) => {
    if (quantidade <= 0) {
      removeFromCart(id, tamanho, tipoPizza, sabor1, sabor2)
      return
    }

    setCart(prev =>
      prev.map(item =>
        item.produto.id === id &&
        item.tamanho === tamanho &&
        item.tipoPizza === tipoPizza &&
        item.sabor1 === sabor1 &&
        item.sabor2 === sabor2
          ? { ...item, quantidade }
          : item
      )
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const subtotal = cart.reduce((sum, item) => sum + (item.precoUnitario || 0) * item.quantidade, 0)
  const total = subtotal + taxaEntrega
  const cartCount = cart.reduce((sum, item) => sum + item.quantidade, 0)

  return {
    cart,
    subtotal,
    total,
    taxaEntrega,
    cartCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setTaxaEntrega
  }
}
