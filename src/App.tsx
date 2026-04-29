import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MetaPeriodoProvider } from './contexts/MetaPeriodoContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Lazy Loading das páginas
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
const AdminGuard = lazy(() => import('./components/admin/AdminGuard'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1, refetchOnWindowFocus: false } },
})

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-5xl font-[Outfit] font-bold text-on-background tracking-tighter">{title}</h2>
      <p className="text-on-surface-variant mt-4">Em desenvolvimento — Fase 2</p>
    </div>
  )
}

// Loading fallback para páginas lazy-loaded
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-on-surface-variant text-sm">Carregando...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
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
                    <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                    <Route path="/admin/*" element={<AdminGuard><AdminDashboard /></AdminGuard>} />

                    {/* Rotas privadas */}
                    <Route element={<ProtectedRoute><MetaPeriodoProvider><Layout /></MetaPeriodoProvider></ProtectedRoute>}>
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
                </Suspense>
                <ToastContainer />
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}