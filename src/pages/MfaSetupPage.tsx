import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function MfaSetupPage() {
  const { enrollMfa, verifyOtp, user } = useAuth()
  const [step, setStep] = useState<'intro' | 'qr' | 'verify'>('intro')
  const [enrollData, setEnrollData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleEnroll = async () => {
    setLoading(true)
    const { data, error } = await enrollMfa()
    if (error) {
      setError(error.message)
    } else {
      setEnrollData(data)
      setStep('qr')
    }
    setLoading(false)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const { error } = await verifyOtp(code)
    if (error) {
      setError('Código inválido. Tente novamente.')
    } else {
      setStep('verify')
      setTimeout(() => navigate('/configuracoes'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-xl">
        {step === 'intro' && (
          <div className="text-center space-y-6">
            <span className="material-symbols-outlined text-6xl text-primary">security</span>
            <h2 className="text-3xl font-[Outfit] font-bold text-on-surface">Ativar Autenticação em Duas Etapas</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Adicione uma camada extra de segurança à sua conta. Para entrar, você precisará da sua senha e de um código gerado pelo seu celular.
            </p>
            <button 
              onClick={handleEnroll}
              disabled={loading}
              className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-bold uppercase tracking-widest"
            >
              Começar Configuração
            </button>
          </div>
        )}

        {step === 'qr' && enrollData && (
          <div className="text-center space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-on-surface">Escaneie o Código QR</h3>
            <p className="text-sm text-on-surface-variant">Use um aplicativo como Google Authenticator ou Authy.</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
              {/* Mostra o QR Code ou a chave secreta se o QR for URI */}
              <img src={enrollData.totp.qr_code} alt="QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl text-left">
              <span className="text-[10px] font-bold text-primary uppercase block mb-1">Ou digite o código manualmente:</span>
              <code className="text-sm break-all text-on-surface font-mono">{enrollData.totp.secret}</code>
            </div>

            <form onSubmit={handleVerify} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant block text-left ml-1">Digite o código gerado:</label>
                <input 
                  className="w-full bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary rounded-xl py-4 text-center text-2xl font-black tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              {error && <p className="text-error text-xs font-bold">{error}</p>}
              <button 
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-bold"
              >
                {loading ? 'Verificando...' : 'Verificar e Ativar'}
              </button>
            </form>
          </div>
        )}

        {step === 'verify' && (
          <div className="text-center space-y-6 animate-fade-in">
            <span className="material-symbols-outlined text-6xl text-success animate-bounce">check_circle</span>
            <h2 className="text-3xl font-[Outfit] font-bold text-on-surface">MFA Ativado!</h2>
            <p className="text-on-surface-variant">
              Sua conta agora está protegida com autenticação em duas etapas. Da próxima vez que entrar, solicitaremos o código.
            </p>
            <p className="text-xs text-on-surface-variant/60">Redirecionando para as configurações...</p>
          </div>
        )}
      </div>
    </div>
  )
}
