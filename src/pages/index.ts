// ============================================
// PAGES - Barrel Exports
// ============================================
// Importe todas as páginas de: src/pages/index.ts
// Ex: import { DashboardPage, PedidosPage } from '@/pages'

// Main Pages
export { default as DashboardPage } from './DashboardPage'
export { default as PedidosPage } from './PedidosPage'
export { default as PdvPage } from './PdvPage'
export { default as CozinhaPage } from './CozinhaPage'
export { default as CardapioAdminPage } from './CardapioAdminPage'
export { default as CardapioOnlinePage } from './CardapioOnlinePage'
export { default as ClientesPage } from './ClientesPage'
export { default as EstoquePage } from './EstoquePage'
export { default as FinanceiroPage } from './FinanceiroPage'
export { default as EntregasPage } from './EntregasPage'
export { default as MesaPage } from './MesaPage'
export { default as MotoboyApp } from './MotoboyApp'

// Auth Pages
export { default as LoginPage } from './LoginPage'

export { default as AdminLogin } from './admin/AdminLogin'
export { default as AdminDashboard } from './admin/AdminDashboard'

// Config Pages
export { default as ConfiguracoesPage } from './ConfiguracoesPage'
export { default as FixRLSPage } from './FixRLSPage'
export { default as WhatsappInboxPage } from './WhatsappInboxPage'

// Pedido Status Page
export { default as PedidoStatusPage } from './PedidoStatusPage'

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
export { LoadingState as PedidosEmptyState } from './pedidos/PedidosEmptyState'
export { PedidoActionsModal as PedidoActions } from './pedidos/PedidoActions'

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
