import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { FloatingAgentChat } from './chat/FloatingAgentChat'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const userId = user?.id || ''
  const tenantId = (user?.user_metadata as Record<string, unknown>)?.tenant_id as string || userId

  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-16 lg:ml-20 min-h-screen">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 glass hover:bg-primary/20 active:scale-95 transition-all duration-200 shadow-lg animate-fade-in"
        >
          <span className="material-symbols-outlined text-on-surface text-xl font-medium">menu</span>
        </button>
        <div className="max-w-[1600px] mx-auto pt-12 md:pt-6 px-3 sm:px-4 md:px-6 lg:px-8 pb-8 md:pb-12 animate-fade-in-up">
          <Outlet />
        </div>
      </main>

      {/* Widget do agente de IA — aparece apenas no sistema interno */}
      <FloatingAgentChat userId={userId} tenantId={tenantId} autoOpenOnLogin={false} />
    </div>
  )
}

