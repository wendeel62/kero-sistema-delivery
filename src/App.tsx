import { lazy, Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MetaPeriodoProvider } from './contexts/MetaPeriodoContext'
import { ThemeProvider } from './contexts/ThemeContext'
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
const WhatsappInboxPage = lazy(() => import('./pages/WhatsappInboxPage'))
const CozinhaPage = lazy(() => import('./pages/CozinhaPage'))
const MfaPage = lazy(() => import('./pages/MfaPage'))
const MfaSetupPage = lazy(() => import('./pages/MfaSetupPage'))
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
 * PlaceholderPage para rotas em desenvolvimento
 */
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-5xl font-[Outfit] font-bold text-on-background tracking-tighter">
        {title}
      </h2>
      <p className="text-on-surface-variant mt-4">Em desenvolvimento — Fase 2</p>
    </div>
  )
}

/**
 * Componente de Roteamento com Lazy Loading
 */
function AppRoutes() {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)

  // Monitora mudança de rota para loading
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [location])

  return (
    <>
      {isLoading && <LoadingSpinner />}
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cardapio/:slug" element={<CardapioOnlinePage />} />
        <Route path="/mesa/:numero" element={<MesaPage />} />
        <Route path="/motoboy" element={<MotoboyApp />} />
        <Route path="/pedido/:numero" element={<PedidoStatusPage />} />
        <Route path="/cozinha" element={<CozinhaPage />} />
        <Route path="/mfa-verify" element={<MfaPage />} />

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
          <Route path="/whatsapp" element={<WhatsappInboxPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/mfa-setup" element={<MfaSetupPage />} />
        </Route>
      </Routes>
    </>
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
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
