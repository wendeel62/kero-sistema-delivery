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
      setError('Acesso negado: E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const adminEmailEnv = import.meta.env.VITE_ADMIN_EMAIL
    if (data.user.email !== adminEmailEnv) {
      await supabase.auth.signOut()
      setError('Acesso negado: Este e-mail não possui permissão de administrador.')
      setLoading(false)
      return
    }

    navigate('/admin')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0e0f14' }}
    >
      <div
        className="w-[380px] border"
        style={{
          background: '#12141a',
          borderColor: '#1e2028',
          borderRadius: '12px',
          padding: '40px',
        }}
      >
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <h1
            className="font-bold tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif', color: '#e8391a', fontSize: '22px' }}
          >
            Kero ADM
          </h1>
          <p
            className="mt-1"
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#4b5563' }}
          >
            Acesso restrito
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block mb-1.5"
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}
            >
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full outline-none transition-colors"
              style={{
                background: '#0e0f14',
                color: '#f1f5f9',
                border: '1px solid #1e2028',
                borderRadius: '8px',
                padding: '10px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#e8391a')}
              onBlur={(e) => (e.target.style.borderColor = '#1e2028')}
            />
          </div>

          <div>
            <label
              className="block mb-1.5"
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6b7280' }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full outline-none transition-colors"
              style={{
                background: '#0e0f14',
                color: '#f1f5f9',
                border: '1px solid #1e2028',
                borderRadius: '8px',
                padding: '10px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#e8391a')}
              onBlur={(e) => (e.target.style.borderColor = '#1e2028')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full transition-colors flex items-center justify-center disabled:opacity-80"
            style={{
              background: '#e8391a',
              color: '#fff',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 'bold',
              fontSize: '14px',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#c62d14')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#e8391a')}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {error && (
            <div
              className="text-center w-full"
              style={{
                background: '#1c0a0a',
                border: '1px solid #7f1d1d',
                color: '#fca5a5',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                borderRadius: '6px',
                padding: '10px 14px',
                marginTop: '16px',
              }}
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

