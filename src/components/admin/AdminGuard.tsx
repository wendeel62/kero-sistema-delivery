import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
      if (session?.user && session.user.email === adminEmail) {
        setStatus('allowed')
      } else {
        setStatus('denied')
      }
    })
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0f14' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#e8391a', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}>
            Verificando acesso...
          </p>
        </div>
      </div>
    )
  }

  if (status === 'denied') {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
