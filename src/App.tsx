import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/Toast'
import { ErrorBoundary } from './components/error-boundary'
import { MetaPeriodoProvider } from './contexts/MetaPeriodoContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PwaProvider } from './contexts/PwaContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AdminGuard from './components/admin/AdminGuard'
import { queryClient } from './lib/queryClient'

// Lazy imports para code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ClientesPage = lazy(() => import('./pages/ClientesPage'))
const PedidosPage = lazy(() => import('./pages/PedidosPage'))
const CardapioAdminPage = lazy(() => import('./pages/CardapioAdminPage'))
const CardapioOnlinePage = lazy(() => import('./pages/CardapioOnlinePage'))
const PdvPage = lazy(() => import('./pages/PdvPage'))
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'))
const EstoquePage = lazy(() => import('./pages/EstoquePage'))
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'))
const MesaPage = lazy(() => import('./pages/MesaPage'))
const EntregasPage = lazy(() => import('./pages/EntregasPage'))
const MotoboyApp = lazy(() => import('./pages/MotoboyApp'))
const PedidoStatusPage = lazy(() => import('./pages/PedidoStatusPage'))
const CozinhaPage = lazy(() => import('./pages/CozinhaPage'))

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

/**
 * Loading Spinner com animação
 */
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-container">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-on-surface-variant font-medium">Carregando...</p>
      </div>
    </div>
  )
}

/**
 * Componente de Roteamento com Lazy Loading
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cardapio/:slug" element={<CardapioOnlinePage />} />
      <Route path="/mesa/:numero" element={<MesaPage />} />
      <Route path="/motoboy" element={<MotoboyApp />} />
      <Route path="/pedido/:numero" element={<PedidoStatusPage />} />
      <Route path="/cozinha" element={<CozinhaPage />} />

      {/* Rotas Admin SaaS — isoladas */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/*"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />

      {/* Rotas privadas */}
      <Route
        element={
          <ProtectedRoute>
            <MetaPeriodoProvider>
              <Layout />
            </MetaPeriodoProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pedidos" element={<PedidosPage />} />
        <Route path="/pdv" element={<PdvPage />} />
        <Route path="/cardapio-admin" element={<CardapioAdminPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/entregas" element={<EntregasPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
      </Route>
    </Routes>
  )
}

/**
 * App Principal com Lazy Loading e Code Splitting
 */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PwaProvider>
            <AuthProvider>
              <ToastProvider>
                <BrowserRouter>
                  <Suspense fallback={<LoadingSpinner />}>
                  <AppRoutes />
                  <ToastContainer />
                  </Suspense>
                </BrowserRouter>
              </ToastProvider>
            </AuthProvider>
          </PwaProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
