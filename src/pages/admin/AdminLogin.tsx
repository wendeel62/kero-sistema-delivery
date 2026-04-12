import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError('Acesso negado')
      setLoading(false)
      return
    }

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
    if (data.user.email !== adminEmail) {
      await supabase.auth.signOut()
      setError('Acesso negado')
      setLoading(false)
      return
    }

    navigate('/admin')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0e0f14', fontFamily: 'DM Sans, sans-serif' }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-2xl border"
        style={{ background: '#12141a', borderColor: '#1e2028' }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif', color: '#e8391a' }}
          >
            Kero ADM
          </h1>
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
            Painel de Controle SaaS
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1"
              style={{
                background: '#1e2028',
                color: '#e5e7eb',
                border: '1px solid #2d3040',
                fontFamily: 'DM Sans, sans-serif',
              }}
              placeholder="admin@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1"
              style={{
                background: '#1e2028',
                color: '#e5e7eb',
                border: '1px solid #2d3040',
                fontFamily: 'DM Sans, sans-serif',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="text-sm text-center py-2 rounded-lg"
              style={{ background: '#7f1d1d', color: '#fca5a5' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-60"
            style={{
              background: '#e8391a',
              color: '#fff',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
