import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import { supabase } from '../../lib/supabase'
import { type AdminProject } from '../../config/adminProjects'

export const AdminLayoutContext = {
  activeProject: null as AdminProject | null,
}

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [activeProject, setActiveProject] = useState<AdminProject | null>(null)
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminEmail(session?.user?.email || '')
    })
  }, [])

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0e0f14', fontFamily: 'DM Sans, sans-serif' }}
    >
      <AdminSidebar
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        adminEmail={adminEmail}
      />
      <main className="flex-1 overflow-y-auto" style={{ background: '#0e0f14' }}>
        {/* Pass activeProject through cloneElement or Context */}
        {typeof children === 'function'
          ? (children as any)(activeProject)
          : children}
      </main>
    </div>
  )
}

// Convenience wrapper for rendering children that need the active project
export function AdminLayoutWithProject({
  render,
}: {
  render: (activeProject: AdminProject | null) => React.ReactNode
}) {
  const [activeProject, setActiveProject] = useState<AdminProject | null>(null)
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminEmail(session?.user?.email || '')
    })
  }, [])

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0e0f14', fontFamily: 'DM Sans, sans-serif' }}
    >
      <AdminSidebar
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        adminEmail={adminEmail}
      />
      <main className="flex-1 overflow-y-auto" style={{ background: '#0e0f14' }}>
        {render(activeProject)}
      </main>
    </div>
  )
}
