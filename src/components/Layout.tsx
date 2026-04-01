import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-20 min-h-screen">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#16181f] rounded-lg border border-[#252830]"
        >
          <span className="material-symbols-outlined text-white">menu</span>
        </button>
        <div className="max-w-[1600px] mx-auto pt-4 md:pt-6 px-2 md:px-8 pb-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

