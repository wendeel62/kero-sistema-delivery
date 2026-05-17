// ============================================
// COMPONENTS - Barrel Exports
// ============================================
// Importe todos os componentes de: src/components/index.ts
// Ex: import { Sidebar, Topbar, Toast } from '@/components'

// Layout Components
export { Layout } from './Layout'
export { Sidebar } from './Sidebar'
export { Topbar } from './Topbar'

// UI Components
export { Toast } from './Toast'
export { ConfigToggle } from './ConfigToggle'
export { ConfigInputField } from './ConfigInputField'
export { CategoryFilters } from './CategoryFilters'
export { ProductCard } from './ProductCard'
export { NpsWidget } from './NpsWidget'
export { DivisaoConta } from './DivisaoConta'
export { AgentAvatar } from './AgentAvatar'
export { FloatingAgentChat } from './FloatingAgentChat'
export { LoadingSpinner, LoadingSkeleton, TableSkeleton } from './LoadingSpinner'

// Admin Components
export { AdminLayout } from './admin/AdminLayout'
export { AdminSidebar } from './admin/AdminSidebar'
export { AdminGuard } from './admin/AdminGuard'

// Error Boundary
export { ErrorBoundary } from './error-boundary/ErrorBoundary'

// Protected Route
export { ProtectedRoute } from './ProtectedRoute'

// MFA
export { MfaSetupModal } from './MfaSetupModal'

// Dashboard Components
export { DashboardGrid } from './dashboard/DashboardGrid'
export { DashboardHeader } from './dashboard/DashboardHeader'
export { KpiCards } from './dashboard/KpiCards'
export { PicosChart } from './dashboard/PicosChart'
export { TempoPedidos } from './dashboard/TempoPedidos'
export { ReceitaChart } from './dashboard/ReceitaChart'
export { FunilVendas } from './dashboard/FunilVendas'

// Pedidos Components
export { PedidoCard } from './pedidos/PedidoCard'

// Cozinha Components
export { CardPedidoCozinha } from './cozinha/CardPedidoCozinha'

// Cardápio Components
export { CategoriaList } from './cardapio/CategoriaList'
export { CategoriaModal } from './cardapio/CategoriaModal'
export { ProdutoList } from './cardapio/ProdutoList'
export { ProdutoFormSidebar } from './cardapio/ProdutoFormSidebar'
export { SaborModal } from './cardapio/SaborModal'
export { ComplementosTab } from './cardapio/ComplementosTab'

// PDV Components
export { MesasGrid } from './pdv/MesasGrid'
export { MesasPanel } from './pdv/MesasPanel'
export { OcuparMesaModal } from './pdv/OcuparMesaModal'
export { PedidoCart } from './pdv/PedidoCart'
export { VariacoesModal } from './pdv/VariacoesModal'

// Mapa Components
export { MapaContainer } from './mapa/MapaContainer'
export { EntregaMarkers } from './mapa/EntregaMarkers'
export { RotasEntrega, EstabelecimentoMarker } from './mapa/RotasEntrega'
export { FiltrosMapa } from './mapa/FiltrosMapa'
export { EntregaPopup } from './mapa/EntregaPopup'
export { useMapaEntregas } from './mapa/useMapaEntregas'
export { useRotas } from './mapa/useRotas'

// Chat Components
export { ChatWindow } from './chat/ChatWindow'
export { ChatButton } from './chat/ChatButton'
export { ChatHeader } from './chat/ChatHeader'
export { MessageList } from './chat/MessageList'
export { MessageInput } from './chat/MessageInput'
export { useChatMessages } from './chat/useChatMessages'
export { useChatIntegrations } from './chat/useChatIntegrations'

// Legacy - MapaEntregas (apenas compatibilidade)
export { default as MapaEntregas } from './MapaEntregas'
