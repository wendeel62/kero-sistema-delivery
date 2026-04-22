import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withTenantFilter, TenantAccessDeniedError } from './tenant-utils'

// Mock do Supabase antes de importar o módulo
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null }
      })
    }
  }
}))

describe('withTenantFilter', () => {
  it('deve adicionar filtro tenant_id à query', () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis()
    }
    
    const result = withTenantFilter(mockQuery, 'tenant-123')
    
    expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123')
  })

  it('deve usar tenant_id fornecido', () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis()
    }
    
    withTenantFilter(mockQuery, 'custom-tenant-id')
    
    expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'custom-tenant-id')
  })
})

describe('TenantAccessDeniedError', () => {
  it('deve ter mensagem padrão', () => {
    const error = new TenantAccessDeniedError()
    expect(error.message).toBe('Acesso negado. Você não tem permissão para acessar este recurso.')
  })

  it('deve aceitar mensagem customizada', () => {
    const error = new TenantAccessDeniedError('Mensagem customizada')
    expect(error.message).toBe('Mensagem customizada')
  })

  it('deve ter name correto', () => {
    const error = new TenantAccessDeniedError()
    expect(error.name).toBe('TenantAccessDeniedError')
  })
})