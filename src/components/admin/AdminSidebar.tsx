import * as LucideIcons from 'lucide-react'
import { LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ADMIN_PROJECTS, type AdminProject } from '../../config/adminProjects'

interface AdminSidebarProps {
  activeProject: AdminProject | null
  onSelectProject: (project: AdminProject | null) => void
  adminEmail: string
}

function DynamicIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = (LucideIcons as Record<string, any>)[name]
  if (!Icon) return null
  return <Icon size={size} />
}

export default function AdminSidebar({ activeProject, onSelectProject, adminEmail }: AdminSidebarProps) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: 240,
        background: '#0e0f14',
        borderRight: '1px solid #1e2028',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b" style={{ borderColor: '#1e2028' }}>
        <span
          className="text-lg font-bold block"
          style={{ fontFamily: 'Syne, sans-serif', color: '#e8391a' }}
        >
          ADM
        </span>
        <span className="text-xs" style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}>
          v1.0
        </span>
      </div>

      {/* Visão Geral */}
      <div className="px-3 pt-4 pb-2">
        <p className="text-xs uppercase tracking-widest mb-1 px-2" style={{ color: '#4b5563', fontFamily: 'DM Sans, sans-serif' }}>
          Visão Geral
        </p>
        <button
          onClick={() => onSelectProject(null)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            borderLeft: !activeProject ? '2px solid #e8391a' : '2px solid transparent',
            background: !activeProject ? '#1e2028' : 'transparent',
            color: !activeProject ? '#e5e7eb' : '#9ca3af',
          }}
        >
          <LucideIcons.LayoutDashboard size={16} />
          Dashboard Global
        </button>
      </div>

      {/* Meus SaaS */}
      <div className="px-3 pt-2 pb-2 flex-1">
        <p className="text-xs uppercase tracking-widest mb-1 px-2" style={{ color: '#4b5563', fontFamily: 'DM Sans, sans-serif' }}>
          Meus SaaS
        </p>
        {ADMIN_PROJECTS.map(project => {
          const isActive = activeProject?.id === project.id
          const isComingSoon = project.status === 'coming_soon'

          return (
            <div key={project.id}>
              <button
                disabled={isComingSoon}
                onClick={() => !isComingSoon && onSelectProject(project)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  borderLeft: isActive ? `2px solid ${project.color}` : '2px solid transparent',
                  background: isActive ? '#1e2028' : 'transparent',
                  color: isComingSoon ? '#6b7280' : isActive ? '#e5e7eb' : '#9ca3af',
                  opacity: isComingSoon ? 0.4 : 1,
                  cursor: isComingSoon ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={{ color: isActive ? project.color : 'inherit' }}>
                  <DynamicIcon name={project.icon} size={16} />
                </span>
                <span className="flex-1 text-left">{project.name}</span>
                {isComingSoon && (
                  <span
                    className="text-xs rounded px-1.5 py-0.5"
                    style={{ background: '#1e2028', color: '#9ca3af', fontSize: 10 }}
                  >
                    Em breve
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: '#1e2028' }}>
        <p
          className="text-xs truncate mb-3"
          style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}
        >
          {adminEmail}
        </p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm transition-colors w-full"
          style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  )
}
