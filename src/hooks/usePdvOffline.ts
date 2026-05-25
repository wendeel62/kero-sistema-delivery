import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncCliente } from '../lib/syncCliente'

// ============================================
// TYPES
// ============================================

export interface OfflinePedido {
  id: string
  tenant_id: string
  cliente_nome: string | null
  cliente_telefone: string | null
  tipo: 'balcao' | 'entrega' | 'mesa'
  mesa_numero: number | null
  subtotal: number
  desconto: number
  total: number
  forma_pagamento: string
  status: string
  observacoes: string | null
  endereco_entrega: string | null
  created_at: string
  itens: Array<{
    produto_id: string
    produto_nome: string
    quantidade: number
    preco_unitario: number
    total: number
    observacoes: string | null
  }>
  synced?: boolean
}

export interface SyncStatus {
  isOnline: boolean
  pendingCount: number
  lastSync: Date | null
  isSyncing: boolean
  error: string | null
}

export interface UsePdvOfflineReturn {
  // Sync status
  syncStatus: SyncStatus

  // Actions
  savePedidoOffline: (pedido: Omit<OfflinePedido, 'id' | 'created_at'>) => Promise<string>
  syncPendingPedidos: () => Promise<void>
  clearSyncQueue: () => Promise<void>

  // Helpers
  isOnline: boolean
  getPendingPedidos: () => Promise<OfflinePedido[]>
}

// ============================================
// CONSTANTS
// ============================================

const DB_NAME = 'pdv-offline-db'
const PEDIDOS_STORE = 'pedidos'
// SYNC_QUEUE_KEY unused - kept for future sync queue implementation
// const SYNC_QUEUE_KEY = 'pdv-sync-queue'

// ============================================
// UTILS
// ============================================

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(PEDIDOS_STORE)) {
        const store = db.createObjectStore(PEDIDOS_STORE, { keyPath: 'id' })
        store.createIndex('tenant_id', 'tenant_id', { unique: false })
        store.createIndex('created_at', 'created_at', { unique: false })
        store.createIndex('synced', 'synced', { unique: false })
      }
    }
  })
}

const saveToIndexedDB = async (pedido: OfflinePedido): Promise<void> => {
  try {
    const db = await openDB()
    const tx = db.transaction(PEDIDOS_STORE, 'readwrite')
    const store = tx.objectStore(PEDIDOS_STORE)
    await new Promise<void>((resolve, reject) => {
      const request = store.add({ ...pedido, synced: false })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Erro ao salvar no IndexedDB:', error)
    throw error
  }
}

const getPendingPedidosFromDB = async (): Promise<OfflinePedido[]> => {
  try {
    const db = await openDB()
    const tx = db.transaction(PEDIDOS_STORE, 'readonly')
    const store = tx.objectStore(PEDIDOS_STORE)
    const index = store.index('synced')

    return new Promise((resolve, reject) => {
      const request = index.getAll()
      request.onsuccess = () => {
        const allPedidos = request.result as OfflinePedido[]
        const pending = allPedidos.filter(p => !p.synced)
        resolve(pending)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Erro ao buscar pedidos pendentes:', error)
    return []
  }
}

const markAsSynced = async (id: string): Promise<void> => {
  try {
    const db = await openDB()
    const tx = db.transaction(PEDIDOS_STORE, 'readwrite')
    const store = tx.objectStore(PEDIDOS_STORE)

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const pedido = getRequest.result
        if (pedido) {
          pedido.synced = true
          const putRequest = store.put(pedido)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  } catch (error) {
    console.error('Erro ao marcar como sincronizado:', error)
  }
}

// ============================================
// HOOK
// ============================================

export function usePdvOffline() {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      const pending = await getPendingPedidosFromDB()
      setPendingCount(pending.length)
    }
    updateCount()
  }, [])

  // Save pedido to offline queue
  const savePedidoOffline = useCallback(async (pedido: Omit<OfflinePedido, 'id' | 'created_at'>): Promise<string> => {
    const id = generateId()
    const offlinePedido: OfflinePedido = {
      ...pedido,
      id,
      created_at: new Date().toISOString()
    }

    try {
      await saveToIndexedDB(offlinePedido)
      setPendingCount(prev => prev + 1)
      return id
    } catch (error) {
      console.error('Erro ao salvar pedido offline:', error)
      throw error
    }
  }, [])

  // Sync pending pedidos to Supabase
  const syncPendingPedidos = useCallback(async () => {
    if (!isOnline) {
      setSyncError('Sem conexão com a internet')
      return
    }

    if (isSyncing) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      const pendingPedidos = await getPendingPedidosFromDB()

      for (const pedido of pendingPedidos) {
        try {
          // Insert pedido
          const { data: insertedPedido, error: pedidoError } = await supabase
            .from('pedidos')
            .insert({
              tenant_id: pedido.tenant_id,
              cliente_nome: pedido.cliente_nome,
              cliente_telefone: pedido.cliente_telefone,
              tipo: pedido.tipo,
              mesa_numero: pedido.mesa_numero,
              subtotal: pedido.subtotal,
              desconto: pedido.desconto,
              total: pedido.total,
              forma_pagamento: pedido.forma_pagamento,
              status: pedido.status,
              observacoes: pedido.observacoes,
              endereco_entrega: pedido.endereco_entrega,
            })
            .select()
            .single()

          if (pedidoError) {
            console.error('Erro ao sincronizar pedido:', pedidoError)
            continue
          }

          // Insert itens do pedido
          if (pedido.itens && pedido.itens.length > 0 && insertedPedido) {
            const itensToInsert = pedido.itens.map(item => ({
              pedido_id: insertedPedido.id,
              tenant_id: pedido.tenant_id,
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              total: item.total,
              observacoes: item.observacoes,
            }))

            const { error: itensError } = await supabase
              .from('itens_pedido')
              .insert(itensToInsert)

            if (itensError) {
              console.error('Erro ao sincronizar itens do pedido:', itensError)
            }
          }

          // Mark as synced
          await markAsSynced(pedido.id)

          // Sync client data
          if (pedido.cliente_nome || pedido.cliente_telefone) {
            await syncCliente(
              pedido.cliente_nome || '',
              pedido.cliente_telefone || '',
              pedido.total,
              pedido.tenant_id,
              pedido.endereco_entrega || undefined,
            )
          }
        } catch (error) {
          console.error('Erro ao sincronizar pedido:', error)
        }
      }

      setLastSync(new Date())
      setPendingCount(0)
    } catch (error: unknown) {
      setSyncError((error as Error)?.message || 'Erro na sincronização')
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing])

  // Clear sync queue
  const clearSyncQueue = useCallback(async () => {
    try {
      const db = await openDB()
      const tx = db.transaction(PEDIDOS_STORE, 'readwrite')
      const store = tx.objectStore(PEDIDOS_STORE)
      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      setPendingCount(0)
    } catch (error) {
      console.error('Erro ao limpar fila de sincronização:', error)
      throw error
    }
  }, [])

  // Get pending pedidos
  const getPendingPedidos = useCallback(async (): Promise<OfflinePedido[]> => {
    return await getPendingPedidosFromDB()
  }, [])

  // Auto-sync when online status changes
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingPedidos()
    }
  }, [isOnline, pendingCount, syncPendingPedidos])

  const syncStatus: SyncStatus = {
    isOnline,
    pendingCount,
    lastSync,
    isSyncing,
    error: syncError
  }

  return {
    syncStatus,
    savePedidoOffline,
    syncPendingPedidos,
    clearSyncQueue,
    isOnline,
    getPendingPedidos
  }
}
