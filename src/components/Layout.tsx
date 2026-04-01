import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-16 lg:ml-20 min-h-screen">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-3 left-3 z-50 p-2 bg-[#16181f] rounded-lg border border-[#252830] active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-white text-xl">menu</span>
        </button>
        <div className="max-w-[1600px] mx-auto pt-12 md:pt-6 px-3 sm:px-4 md:px-6 lg:px-8 pb-8 md:pb-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

