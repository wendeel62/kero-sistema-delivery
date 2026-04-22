import { describe, it, expect } from 'vitest'
import { pedidoSchema } from './pedidoSchema'

describe('pedidoSchema', () => {
  it('deve validar pedido completo', () => {
    const pedido = {
      cliente_nome: 'Cliente Teste',
      cliente_telefone: '11999999999',
      total: 100.50,
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = pedidoSchema.safeParse(pedido)
    expect(result.success).toBe(true)
  })

  it('deve rejecting total negativo', () => {
    const pedido = {
      cliente_nome: 'Cliente Teste',
      total: -10,
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = pedidoSchema.safeParse(pedido)
    expect(result.success).toBe(false)
  })
})