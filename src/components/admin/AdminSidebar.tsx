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
        width: '220px',
        background: '#0e0f14',
        borderRight: '1px solid #1e2028',
        flexShrink: 0,
      }}
    >
      {/* Topo da sidebar */}
      <div style={{ padding: '24px 16px 20px', borderBottom: '1px solid #1e2028' }}>
        <div className="flex items-baseline gap-2">
          <span
            style={{ fontFamily: 'Syne, sans-serif', fontWeight: 'bold', fontSize: '15px', color: '#e8391a' }}
          >
            Kero ADM
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#4b5563' }}>
            v1.0
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* VISÃO GERAL */}
        <div style={{ paddingTop: '8px' }}>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '10px',
              fontWeight: 600,
              color: '#4b5563',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              padding: '16px 16px 8px',
            }}
          >
            Visão Geral
          </p>
          <button
            onClick={() => onSelectProject(null)}
            className="w-full flex items-center transition-colors group"
            style={{
              padding: '8px 16px',
              gap: '10px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              borderLeft: !activeProject ? '2px solid #e8391a' : '2px solid transparent',
              background: !activeProject ? '#1a1c25' : 'transparent',
              color: !activeProject ? '#ffffff' : '#6b7280',
            }}
            onMouseOver={(e) => { if (activeProject) { e.currentTarget.style.background = '#12141a'; e.currentTarget.style.color = '#e2e8f0' } }}
            onMouseOut={(e) => { if (activeProject) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' } }}
          >
            <span style={{ color: !activeProject ? '#e8391a' : 'inherit' }} className="flex items-center">
              <LucideIcons.LayoutDashboard size={16} />
            </span>
            Dashboard Global
          </button>
        </div>

        {/* MEUS SAAS */}
        <div>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '10px',
              fontWeight: 600,
              color: '#4b5563',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              padding: '16px 16px 8px',
            }}
          >
            Meus SaaS
          </p>
          {ADMIN_PROJECTS.map(project => {
            const isActive = activeProject?.id === project.id
            const isComingSoon = project.status === 'coming_soon'

            return (
              <button
                key={project.id}
                disabled={isComingSoon}
                onClick={() => !isComingSoon && onSelectProject(project)}
                className="w-full flex items-center transition-colors"
                style={{
                  padding: '8px 16px',
                  gap: '10px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  borderLeft: isActive ? `2px solid ${project.color}` : '2px solid transparent',
                  background: isActive ? '#1a1c25' : 'transparent',
                  color: isActive ? '#ffffff' : '#6b7280',
                  opacity: isComingSoon ? 0.4 : 1,
                  cursor: isComingSoon ? 'not-allowed' : 'pointer',
                }}
                onMouseOver={(e) => { if (!isActive && !isComingSoon) { e.currentTarget.style.background = '#12141a'; e.currentTarget.style.color = '#e2e8f0' } }}
                onMouseOut={(e) => { if (!isActive && !isComingSoon) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280' } }}
              >
                <span style={{ color: isActive ? project.color : 'inherit' }} className="flex items-center">
                  <DynamicIcon name={project.icon} size={16} />
                </span>
                <span className="text-left">{project.name}</span>
                {isComingSoon && (
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '10px',
                      background: '#1e2028',
                      color: '#4b5563',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      marginLeft: 'auto',
                    }}
                  >
                    Em breve
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ borderTop: '1px solid #1e2028', padding: '16px' }}>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: '#4b5563',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '12px'
          }}
        >
          {adminEmail}
        </p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 transition-colors w-full outline-none"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            background: 'transparent',
            border: 'none',
            padding: 0
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#6b7280')}
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}

