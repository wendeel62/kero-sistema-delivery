// ============================================
// HOOKS - Barrel Exports
// ============================================
// Importe todos os hooks de: src/hooks/index.ts
// Ex: import { useAuth, usePedidos } from '@/hooks'

// Auth & Context
export { useAgentContext } from './useAgentContext'
export { useTenantId, useRequiredTenantId } from './useTenantId'

// Dashboard & KPIs
export { useDashboardKpis } from './useDashboardKpis'
export { useSalesKpis } from './useSalesKpis'
export { useCustomerKpis } from './useCustomerKpis'
export { useProductKpis } from './useProductKpis'
export { useDeliveryKpis } from './useDeliveryKpis'
export { useFinancialKpis } from './useFinancialKpis'
export { useGlobalMetrics } from './useGlobalMetrics'
export { useAdminMetrics } from './useAdminMetrics'

// PDV
export { usePdv } from './usePdv'
export { usePdvOffline } from './usePdvOffline'
export { usePdvUI } from './usePdvUI'
export { usePdvApi } from './usePdvApi'
export { usePdvState } from './usePdvState'

// Pedidos & Cozinha
export { usePedidos } from './usePedidos'
export { useCozinha } from './useCozinha'

// Cardápio & Admin
export { useCardapioAdmin } from './useCardapioAdmin'

// Tracking & Analytics
export { useTracking } from './useTracking'

// Realtime & Metas
export { useRealtime, useRealtimeSingle } from './useRealtime'
export { useMetasFaturamento } from './useMetasFaturamento'

// Impressão
export { useThermalPrinter } from './useThermalPrinter'

// PWA
export { usePwaInstall } from './usePwaInstall'
export { usePwaUpdate } from './usePwaUpdate'
