import { describe, it, expect } from 'vitest'
import { clienteSchema } from './clienteSchema'

describe('clienteSchema', () => {
  it('deve validar cliente completo', () => {
    const cliente = {
      nome: 'João Silva',
      telefone: '(11) 99999-9999',
      email: 'joao@teste.com',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = clienteSchema.safeParse(cliente)
    expect(result.success).toBe(true)
  })

  it('deve accepting telefone simples', () => {
    const cliente = {
      nome: 'João',
      telefone: '(11) 99999-9999',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = clienteSchema.safeParse(cliente)
    expect(result.success).toBe(true)
  })

  it('deve rejecting email inválido', () => {
    const cliente = {
      nome: 'João',
      telefone: '(11) 99999-9999',
      email: 'email-invalido',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = clienteSchema.safeParse(cliente)
    expect(result.success).toBe(false)
  })
})