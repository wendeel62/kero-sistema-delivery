import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientesPage from './pages/ClientesPage'
import PedidosPage from './pages/PedidosPage'
import CardapioAdminPage from './pages/CardapioAdminPage'
import CardapioOnlinePage from './pages/CardapioOnlinePage'
import PdvPage from './pages/PdvPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'
import EstoquePage from './pages/EstoquePage'
import FinanceiroPage from './pages/FinanceiroPage'
import MesaPage from './pages/MesaPage'
import EntregasPage from './pages/EntregasPage'
import MotoboyApp from './pages/MotoboyApp'
import PedidoStatusPage from './pages/PedidoStatusPage'
import AgenteIaPage from './pages/AgenteIaPage'
import WhatsappInboxPage from './pages/WhatsappInboxPage'

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rota pública */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cardapio" element={<CardapioOnlinePage />} />
            <Route path="/mesa/:numero" element={<MesaPage />} />
            <Route path="/motoboy" element={<MotoboyApp />} />
            <Route path="/pedido/:numero" element={<PedidoStatusPage />} />

            {/* Rotas privadas */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pedidos" element={<PedidosPage />} />
              <Route path="/pdv" element={<PdvPage />} />
              <Route path="/cardapio-admin" element={<CardapioAdminPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/financeiro" element={<FinanceiroPage />} />
              <Route path="/entregas" element={<EntregasPage />} />
              <Route path="/gestor-consultor" element={<AgenteIaPage />} />
              <Route path="/whatsapp" element={<WhatsappInboxPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
