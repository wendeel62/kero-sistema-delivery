/**
 * @description Testes para o hook useRealtime
 * @hook useRealtime - Sincronização em tempo real via Supabase
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRealtime } from '../useRealtime'
import { supabase } from '../../lib/supabase'

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}))

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('nao deve criar canal se configs estiverem vazias', () => {
    renderHook(() =>
      useRealtime({
        configs: [],
      })
    )

    expect(supabase.channel).not.toHaveBeenCalled()
  })

  it('deve criar canal para tabela com filtro', () => {
    const configs = [
      {
        table: 'produtos' as const,
        filter: 'tenant_id=eq.test',
        callback: vi.fn(),
      },
    ]

    renderHook(() => useRealtime({ configs }))

    expect(supabase.channel).toHaveBeenCalled()
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'produtos',
        filter: 'tenant_id=eq.test',
      }),
      expect.any(Function)
    )
  })

  it('deve criar canal para tabela sem filtro', () => {
    const configs = [
      {
        table: 'pedidos' as const,
        callback: vi.fn(),
      },
    ]

    renderHook(() => useRealtime({ configs }))

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'pedidos',
      }),
      expect.any(Function)
    )
  })

  it('deve chamar callback quando evento ocorrer', () => {
    const callback = vi.fn()
    const configs = [
      {
        table: 'produtos' as const,
        filter: 'tenant_id=eq.test',
        callback,
      },
    ]

    renderHook(() => useRealtime({ configs }))

    // Simula o callback sendo chamado
    const callArgs = mockChannel.on.mock.calls[0]
    const handler = callArgs[2]
    handler({ event: '*', new: { id: '1' } })

    expect(callback).toHaveBeenCalled()
  })

  it('deve se inscrever no canal', () => {
    const configs = [
      {
        table: 'produtos' as const,
        filter: 'tenant_id=eq.test',
        callback: vi.fn(),
      },
    ]

    renderHook(() => useRealtime({ configs }))

    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('deve lidar com multiplos configs', () => {
    const configs = [
      {
        table: 'produtos' as const,
        filter: 'tenant_id=eq.test',
        callback: vi.fn(),
      },
      {
        table: 'pedidos' as const,
        filter: 'tenant_id=eq.test',
        callback: vi.fn(),
      },
    ]

    renderHook(() => useRealtime({ configs }))

    expect(mockChannel.on).toHaveBeenCalledTimes(2)
  })
})
