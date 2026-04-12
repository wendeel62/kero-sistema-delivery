import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function MfaPage() {
  const { verifyOtp, loading } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const navigate = useNavigate()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)
    
    const { error } = await verifyOtp(code)
    if (error) {
      setError('Código inválido. Verifique o seu aplicativo de autenticação.')
    } else {
      navigate('/')
    }
    setVerifying(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl font-bold">shield_person</span>
          </div>
          <h2 className="text-2xl font-[Outfit] font-bold text-on-surface">Verificação em Duas Etapas</h2>
          <p className="text-sm text-on-surface-variant mt-2">Digite o código de 6 dígitos gerado pelo seu aplicativo de autenticação.</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {error && (
            <div className="bg-error-container/20 text-error text-xs p-3 rounded-xl text-center font-bold">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant ml-1">Código de Segurança</label>
            <input 
              className="w-full bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary rounded-xl py-4 text-center text-3xl font-black tracking-[0.5em] text-primary"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <button 
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50"
          >
            {verifying ? 'Verificando...' : 'Confirmar'}
          </button>
        </form>
      </div>
    </div>
  )
}
