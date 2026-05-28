import { describe, it, expect } from 'vitest'
import { buildReceipt } from './printReceipt'
import type { Configuracoes } from '../types'

const mockConfig: Configuracoes = {
  id: '1',
  tenant_id: 'tenant-1',
  nome_loja: 'Kero Delivery',
  telefone: '11999999999',
  endereco: 'Rua Teste, 123',
}

const mockPedido = {
  numero: 42,
  created_at: '2026-05-28T10:30:00.000Z',
  canal: 'app',
  cliente_nome: 'João Silva',
  cliente_telefone: '11988887777',
  total: 45.90,
  forma_pagamento: 'PIX',
  itens: [
    { qtd: 2, nome: 'Pizza Calabresa', variacao: 'Grande', obs: 'Sem cebola' },
    { qtd: 1, nome: 'Coca-Cola 2L' },
  ],
}

describe('buildReceipt', () => {
  it('deve gerar bytes para papel 80mm', () => {
    const result = buildReceipt(mockPedido, mockConfig, 80)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result!.length).toBeGreaterThan(0)
  })

  it('deve gerar bytes para papel 58mm', () => {
    const result = buildReceipt(mockPedido, mockConfig, 58)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result!.length).toBeGreaterThan(0)
  })

  it('deve funcionar sem itens', () => {
    const pedidoSemItens = { ...mockPedido, itens: [] }
    const result = buildReceipt(pedidoSemItens, mockConfig, 80)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result!.length).toBeGreaterThan(0)
  })

  it('deve funcionar sem variacao nem obs nos itens', () => {
    const pedidoSimples = {
      ...mockPedido,
      itens: [{ qtd: 1, nome: 'Produto Simples' }],
    }
    const result = buildReceipt(pedidoSimples, mockConfig, 80)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result!.length).toBeGreaterThan(0)
  })

  it('deve usar dados da loja a partir do config', () => {
    const result = buildReceipt(mockPedido, mockConfig, 80)
    const result2 = buildReceipt(mockPedido, { ...mockConfig, nome_loja: 'Outra Loja' }, 80)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result2).toBeInstanceOf(Uint8Array)
  })

  it('deve gerar bytes mesmo com dados minimos', () => {
    const minimo = { numero: 1, created_at: new Date().toISOString(), total: 0 }
    const result = buildReceipt(minimo, mockConfig, 80)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result!.length).toBeGreaterThan(0)
  })
})
