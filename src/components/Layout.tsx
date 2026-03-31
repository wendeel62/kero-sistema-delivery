import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased">
      <Sidebar />
      <main className="ml-20 min-h-screen">
        <div className="max-w-[1600px] mx-auto pt-6 px-8 pb-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

