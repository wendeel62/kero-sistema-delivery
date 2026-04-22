import { vi } from 'vitest'

export const mockAgentes = [
  { id: '1', nome: 'João', email: 'joao@teste.com', tenant_id: 'tenant-1', cargo: 'atendente' },
  { id: '2', nome: 'Maria', email: 'maria@teste.com', tenant_id: 'tenant-1', cargo: 'gerente' }
]

export const mockClientes = [
  { id: '1', nome: 'Cliente 1', telefone: '11999999999', tenant_id: 'tenant-1' },
  { id: '2', nome: 'Cliente 2', telefone: '11888888888', tenant_id: 'tenant-1' }
]

export const mockProdutos = [
  { id: '1', nome: 'Pizza Margherita', preco: 50, tenant_id: 'tenant-1', disponivel: true },
  { id: '2', nome: 'Hambúrguer', preco: 30, tenant_id: 'tenant-1', disponivel: true }
]

export const createMockSupabase = () => ({
  from: vi.fn((table: string) => ({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockResolvedValue({ data: [], error: null }),
    delete: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null })
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
  }
})