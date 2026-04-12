import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { RefreshCcw } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import { supabase } from '../../lib/supabase'
import { type AdminProject } from '../../config/adminProjects'

export const AdminLayoutContext = {
  activeProject: null as AdminProject | null,
}

interface AdminLayoutProps {
  children: React.ReactNode
}

function AdminHeader({ activeProject }: { activeProject: AdminProject | null }) {
  const accentColor = activeProject ? activeProject.color : '#e8391a'
  const projectName = activeProject ? activeProject.name : 'Dashboard Global'
  const subtext = activeProject ? '— Métricas específicas' : '— Visão unificada'

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between"
      style={{
        background: '#0e0f14',
        borderBottom: '1px solid #1e2028',
        padding: '16px 28px',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: accentColor,
          }}
        />
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 'bold', fontSize: '15px', color: '#f1f5f9' }}>
            {projectName}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#4b5563' }}>
            {subtext}
          </span>
        </div>
      </div>

      <button
        onClick={handleRefresh}
        className="flex items-center"
        style={{
          background: '#1a1c25',
          border: '1px solid #252830',
          borderRadius: '6px',
          padding: '6px 12px',
          gap: '6px',
          color: '#9ca3af',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = '#374151'
          e.currentTarget.style.color = '#e2e8f0'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = '#252830'
          e.currentTarget.style.color = '#9ca3af'
        }}
      >
        <RefreshCcw size={12} />
        Atualizar
      </button>
    </header>
  )
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
      <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#0e0f14' }}>
        <AdminHeader activeProject={activeProject} />
        <div style={{ padding: '24px 28px', flex: 1 }}>
          {/* Pass activeProject through cloneElement or Context */}
          {typeof children === 'function'
            ? (children as any)(activeProject)
            : children}
        </div>
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
      <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#0e0f14' }}>
        <AdminHeader activeProject={activeProject} />
        <div style={{ padding: '24px 28px', flex: 1 }}>
          {render(activeProject)}
        </div>
      </main>
    </div>
  )
}
