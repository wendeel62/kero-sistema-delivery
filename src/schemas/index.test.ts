import { describe, it, expect } from 'vitest'
import { validateData, produtoSchema, produtoCreateSchema, produtoItemSchema, paginationSchema, filtrosSchema } from './index'
import { produtoSchema as produtoSchemaRaw } from './produtoSchema'

describe('validateData helper', () => {
  it('deve retornar success para dados válidos', () => {
    const schema = produtoSchemaRaw
    const data = {
      nome: 'Pizza Margherita',
      preco: 50,
      disponivel: true,
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = validateData(schema, data)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('deve retornar error para dados inválidos', () => {
    const schema = produtoSchemaRaw
    const data = { nome: '', preco: -10 }
    const result = validateData(schema, data)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('produtoSchema', () => {
  it('deve validar produto completo válido', () => {
    const produto = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      nome: 'Pizza Margherita',
      descricao: 'Deliciosa pizza italiana',
      preco: 50,
      disponivel: true,
      tempo_preparo: 30,
      imagem_url: ''
    }
    const result = produtoSchema.safeParse(produto)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar nome vazio', () => {
    const produto = {
      nome: '',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = produtoSchema.safeParse(produto)
    expect(result.success).toBe(false)
  })

  it('deve rechazar preco negativo', () => {
    const produto = {
      nome: 'Pizza',
      preco: -10,
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = produtoSchema.safeParse(produto)
    expect(result.success).toBe(false)
  })
})

describe('produtoCreateSchema', () => {
  it('deve validar dados para criação sem id', () => {
    const novoProduto = {
      nome: 'Novo Produto',
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      preco: 25.90
    }
    const result = produtoCreateSchema.safeParse(novoProduto)
    expect(result.success).toBe(true)
  })
})

describe('produtoItemSchema', () => {
  it('deve validar item de pedido válido', () => {
    const item = {
      produto_id: '550e8400-e29b-41d4-a716-446655440000',
      quantidade: 2,
      preco_unitario: 50
    }
    const result = produtoItemSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it('deve rechazar quantidade zero', () => {
    const item = {
      produto_id: '550e8400-e29b-41d4-a716-446655440000',
      quantidade: 0,
      preco_unitario: 50
    }
    const result = produtoItemSchema.safeParse(item)
    expect(result.success).toBe(false)
  })
})

describe('paginationSchema', () => {
  it('deve usar valores default', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
      expect(result.data.order).toBe('asc')
    }
  })

  it('deve validar order asc ou desc', () => {
    const result = paginationSchema.safeParse({ order: 'desc' })
    expect(result.success).toBe(true)
  })
})

describe('filtrosSchema', () => {
  it('deve validar filtros básicos', () => {
    const filtros = {
      busca: 'pizza',
      page: 1,
      limit: 10
    }
    const result = filtrosSchema.safeParse(filtros)
    expect(result.success).toBe(true)
  })

  it('deve aceitar tenant_id opcional', () => {
    const filtros = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000'
    }
    const result = filtrosSchema.safeParse(filtros)
    expect(result.success).toBe(true)
  })
})