/**
 * PDV Hooks - Separados por responsabilidade
 * 
 * Esta refatoração separa o hook usePdv em hooks menores e especializados:
 * 
 * - usePdvState: Gerencia estado local (carrinho, sessão, UI state)
 * - usePdvApi: Chamadas API com React Query (pedidos, pagamentos, mesas)
 * - usePdvUI: Lógica de interface (filtros, validações, handlers)
 * - usePdvOffline: Funcionalidade offline e sync (IndexedDB, fila)
 * 
 * O hook original usePdv.ts agora combina todos esses hooks especializados.
 */

// Hook principal (combinador)
export { usePdv } from './usePdv'

// Hooks especializados
export { usePdvState } from './usePdvState'
export { usePdvApi } from './usePdvApi'
export { usePdvUI } from './usePdvUI'
export { usePdvOffline } from './usePdvOffline'

// Types
export type {
  Categoria,
  Mesa,
  PrecoTamanho,
  Sabor,
  ItemPedido
} from './usePdv'

export type {
  OfflinePedido,
  SyncStatus,
  UsePdvOfflineReturn
} from './usePdvOffline'

export type {
  UsePdvApiReturn,
  CreatePedidoData
} from './usePdvApi'

export type {
  UsePdvUiReturn,
  UsePdvUiDeps
} from './usePdvUI'

export type {
  PdvState,
  PdvActions
} from './usePdvState'
