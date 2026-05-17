// ============================================
// PAGES - Barrel Exports
// ============================================
// Importe todas as páginas de: src/pages/index.ts
// Ex: import { DashboardPage, PedidosPage } from '@/pages'

// Main Pages
export { DashboardPage } from './DashboardPage'
export { PedidosPage } from './PedidosPage'
export { PdvPage } from './PdvPage'
export { CozinhaPage } from './CozinhaPage'
export { CardapioAdminPage } from './CardapioAdminPage'
export { CardapioOnlinePage } from './CardapioOnlinePage'
export { ClientesPage } from './ClientesPage'
export { EstoquePage } from './EstoquePage'
export { FinanceiroPage } from './FinanceiroPage'
export { EntregasPage } from './EntregasPage'
export { MesaPage } from './MesaPage'
export { MotoboyApp } from './MotoboyApp'

// Auth Pages
export { LoginPage } from './LoginPage'
export { MfaPage } from './MfaPage'
export { MfaSetupPage } from './MfaSetupPage'
export { AdminLogin } from './admin/AdminLogin'
export { AdminDashboard } from './admin/AdminDashboard'

// Config Pages
export { ConfiguracoesPage } from './ConfiguracoesPage'
export { FixRLSPage } from './FixRLSPage'
export { WhatsappInboxPage } from './WhatsappInboxPage'

// Pedido Status Page
export { PedidoStatusPage } from './PedidoStatusPage'

// Cardápio Sub-components (páginas internas)
export { BuscaProdutos } from './cardapio/BuscaProdutos'
export { CategoriaTabs } from './cardapio/CategoriaTabs'
export { ProdutoCard } from './cardapio/ProdutoCard'
export { CarrinhoSidebar } from './cardapio/CarrinhoSidebar'
export { CheckoutModal } from './cardapio/CheckoutModal'
export { CatalogoProdutos } from './cardapio/CatalogoProdutos'

// Pedidos Sub-components
export { PedidoFilters } from './pedidos/PedidoFilters'
export { PedidosList } from './pedidos/PedidosList'
export { PedidoModal } from './pedidos/PedidoModal'
export { PedidosEmptyState } from './pedidos/PedidosEmptyState'
export { PedidoActions } from './pedidos/PedidoActions'
export { PedidoStatusBadge } from './pedidos/PedidoStatusBadge'

// Clientes Sub-components
export { ClientesTable } from './clientes/ClientesTable'
export { ClientesFilters } from './clientes/ClientesFilters'
export { ClienteForm } from './clientes/ClienteForm'
export { ClienteDetails } from './clientes/ClienteDetails'
export { ClienteHistorico } from './clientes/ClienteHistorico'

// Estoque Sub-components
export { ProdutosEstoque } from './estoque/ProdutosEstoque'
export { EstoqueAlertas } from './estoque/EstoqueAlertas'

// Financeiro Sub-components
export { RelatoriosFinanceiros } from './financeiro/RelatoriosFinanceiros'
export { FluxoCaixa } from './financeiro/FluxoCaixa'
