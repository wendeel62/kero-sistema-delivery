// ============================================
// COMPONENTS - Barrel Exports
// ============================================
// Importe todos os componentes de: src/components/index.ts
// Ex: import { Sidebar, Topbar, Toast } from '@/components'

// Layout Components
export { default as Layout } from './Layout'
export { default as Sidebar } from './Sidebar'
export { default as Topbar } from './Topbar'

// UI Components
export { default as Toast } from './Toast'
export { ConfigToggle } from './ConfigToggle'
export { ConfigInputField } from './ConfigInputField'
export { default as CategoryFilters } from './CategoryFilters'
export { default as ProductCard } from './ProductCard'
export { default as NpsWidget } from './NpsWidget'
export { default as DivisaoConta } from './DivisaoConta'
export { default as AgentAvatar } from './AgentAvatar'
export { FloatingAgentChat } from './FloatingAgentChat'
export { default as LoadingSpinner, LoadingSkeleton, TableSkeleton } from './LoadingSpinner'

// Admin Components
export { default as AdminLayout } from './admin/AdminLayout'
export { default as AdminSidebar } from './admin/AdminSidebar'
export { default as AdminGuard } from './admin/AdminGuard'

// Error Boundary
export { ErrorBoundary } from './error-boundary/ErrorBoundary'

// Protected Route
export { default as ProtectedRoute } from './ProtectedRoute'

// Dashboard Components
export { default as DashboardHeader } from './Dashboard/DashboardHeader'
export { default as KpiCards } from './Dashboard/KpiCards'
export { default as PicosChart } from './Dashboard/PicosChart'
export { default as TempoPedidos } from './Dashboard/TempoPedidos'
export { default as ReceitaChart } from './Dashboard/ReceitaChart'
export { default as FunilVendas } from './Dashboard/FunilVendas'

// Pedidos Components
export { PedidoCard } from './Pedidos/PedidoCard'

// Cozinha Components
export { default as CardPedidoCozinha } from './cozinha/CardPedidoCozinha'

// Cardápio Components
export { default as CategoriaList } from './cardapio/CategoriaList'
export { default as CategoriaModal } from './cardapio/CategoriaModal'
export { default as ProdutoList } from './cardapio/ProdutoList'
export { default as ProdutoFormSidebar } from './cardapio/ProdutoFormSidebar'
export { default as SaborModal } from './cardapio/SaborModal'
export { default as ComplementosTab } from './cardapio/ComplementosTab'

// PDV Components
export { default as MesasGrid } from './pdv/MesasGrid'
export { default as MesasPanel } from './pdv/MesasPanel'
export { default as OcuparMesaModal } from './pdv/OcuparMesaModal'
export { default as PedidoCart } from './pdv/PedidoCart'
export { default as VariacoesModal } from './pdv/VariacoesModal'

// Mapa Components
export { MapaContainer } from './mapa/MapaContainer'
export { EntregaMarkers } from './mapa/EntregaMarkers'
export { RotasEntrega, EstabelecimentoMarker } from './mapa/RotasEntrega'
export { FiltrosMapa } from './mapa/FiltrosMapa'
export { default as EntregaPopup } from './mapa/EntregaPopup'
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
