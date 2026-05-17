import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isMfaRequired } from '../schemas/auth'

type MfaStep = 'intro' | 'qr' | 'verify' | 'backup' | 'success'

interface BackupCode {
  code: string
}

export default function MfaSetupPage() {
  const { enrollMfa, verifyMFA, user, role, loading: authLoading } = useAuth()
  const [step, setStep] = useState<MfaStep>('intro')
  const [enrollData, setEnrollData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const navigate = useNavigate()
  const location = useLocation()

  // Check if MFA is required for this role
  const isMfaRequiredForRole = role && isMfaRequired(role)

  // Generate backup codes
  const generateBackupCodes = (): string[] => {
    const codes: string[] = []
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    
    for (let i = 0; i < 5; i++) {
      let code = ''
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      codes.push(code)
    }
    
    return codes
  }

  const handleEnroll = useCallback(async () => {
    setLoading(true)
    setError('')
    
    const { data, error } = await enrollMfa()
    
    if (error) {
      setError(error.message || 'Erro ao configurar MFA')
    } else if (data) {
      setEnrollData(data)
      setStep('qr')
    }
    
    setLoading(false)
  }, [enrollMfa])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (code.length !== 6) {
      setError('Código deve ter 6 dígitos')
      setLoading(false)
      return
    }

    const { error } = await verifyMFA(code)
    
    if (error) {
      setError('Código inválido. Tente novamente.')
    } else {
      // Generate backup codes
      const generatedCodes = generateBackupCodes()
      setBackupCodes(generatedCodes)
      setStep('backup')
    }
    
    setLoading(false)
  }

  const handleDownloadBackupCodes = () => {
    const codesText = `Códigos de Backup - Kero System
=====================================
Estes códigos podem ser usados para acessar sua conta caso você perca o acesso ao seu dispositivo de autenticação.

${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Importante:
- Guarde estes códigos em um local seguro
- Cada código pode ser usado apenas uma vez
- Não compartilhe estes códigos com ninguém

Gerado em: ${new Date().toLocaleString('pt-BR')}
`
    
    const blob = new Blob([codesText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'backup-codes-kero.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFinish = () => {
    setStep('success')
    setTimeout(() => {
      // Navigate back to where user came from or to dashboard
      const from = location.state?.from || '/'
      navigate(from)
    }, 2000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-xl">
          {step === 'intro' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-5xl text-primary">security</span>
              </div>
              <div>
                <h2 className="text-3xl font-[Outfit] font-bold text-on-surface">
                  Autenticação em Duas Etapas
                </h2>
                {isMfaRequiredForRole ? (
                  <p className="text-error text-sm mt-2 font-bold">
                    ⚠️ OBRIGATÓRIO: Sua função de {role} exige autenticação em duas etapas.
                  </p>
                ) : (
                  <p className="text-on-surface-variant mt-2">
                    Adicione uma camada extra de segurança à sua conta.
                  </p>
                )}
              </div>
              <p className="text-on-surface-variant leading-relaxed text-sm">
                Para entrar, você precisará da sua senha e de um código gerado pelo seu celular.
                Use Google Authenticator, Authy ou outro app similar.
              </p>
              {error && (
                <div className="bg-error-container/20 text-error text-sm p-3 rounded-xl text-center font-bold">
                  {error}
                </div>
              )}
              <button
                onClick={handleEnroll}
                disabled={loading}
                className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Começar Configuração'}
              </button>
            </div>
          )}

          {step === 'qr' && enrollData && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-on-surface">Escaneie o Código QR</h3>
                <p className="text-sm text-on-surface-variant mt-2">
                  Use Google Authenticator, Authy ou outro app similar.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl flex justify-center">
                {enrollData.totp?.qr_code_url ? (
                  <img src={enrollData.totp.qr_code_url} alt="QR Code MFA" className="w-48 h-48" />
                ) : (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">qr_code_scanner</span>
                    <p className="text-sm text-on-surface-variant mt-2">QR Code indisponível</p>
                  </div>
                )}
              </div>

              {enrollData.totp?.secret && (
                <div className="bg-surface-container-lowest p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">
                    Ou digite manualmente:
                  </p>
                  <code className="text-sm break-all text-on-surface font-mono bg-surface-container px-2 py-1 rounded block text-center">
                    {enrollData.totp.secret}
                  </code>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant block">
                    Código de 6 dígitos:
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary rounded-xl py-4 text-center text-2xl font-black tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-error text-xs font-bold text-center">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-bold uppercase tracking-widest disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Verificando...' : 'Verificar e Ativar'}
                </button>
              </form>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-success text-3xl">key</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Códigos de Backup</h3>
                <p className="text-sm text-on-surface-variant mt-2">
                  Salve estes códigos em um local seguro.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-xl space-y-2">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-outline last:border-b-0">
                    <span className="text-xs text-on-surface-variant">Código {index + 1}:</span>
                    <code className="text-sm font-mono font-bold text-primary">{code}</code>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 bg-surface-container text-on-surface py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Baixar
                </button>
                <button
                  onClick={handleFinish}
                  className="flex-1 bg-primary-container text-on-primary-fixed py-3 rounded-xl font-bold text-sm"
                >
                  Concluir
                </button>
              </div>

              <p className="text-[10px] text-on-surface-variant/60 text-center">
                Você pode baixar os códigos agora ou mais tarde nas configurações.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-success text-3xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface">MFA Ativado!</h3>
                <p className="text-sm text-on-surface-variant mt-2">
                  Sua conta agora está protegida com autenticação em duas etapas.
                </p>
              </div>
              <p className="text-xs text-on-surface-variant/60">
                Redirecionando...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
