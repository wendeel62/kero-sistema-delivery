import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { backupCodesSchema } from '../schemas/auth'

// ============================================
// TYPES
// ============================================

export interface MfaSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BackupCode {
  code: string
  used: boolean
}

// ============================================
// COMPONENT
// ============================================

export default function MfaSetupModal({
  isOpen,
  onClose,
  onSuccess
}: MfaSetupModalProps) {
  const { setupMFA, verifyMFA, user } = useAuth()
  const [step, setStep] = useState<'loading' | 'qr' | 'verify' | 'backup' | 'success'>('loading')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrData, setQrData] = useState<any>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('loading')
      setCode('')
      setError('')
      setQrData(null)
      setBackupCodes([])
      handleEnroll()
    }
  }, [isOpen])

  // Handle MFA enrollment
  const handleEnroll = useCallback(async () => {
    setLoading(true)
    setError('')
    
    const { data, error } = await setupMFA()
    
    if (error) {
      setError(error.message || 'Erro ao configurar MFA')
      setStep('qr')
    } else if (data) {
      setQrData(data)
      setStep('qr')
    }
    
    setLoading(false)
  }, [setupMFA])

  // Handle verification code submission
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
      // Generate backup codes (simulated - in production, these would come from the server)
      const generatedCodes = generateBackupCodes()
      setBackupCodes(generatedCodes)
      setStep('backup')
    }
    
    setLoading(false)
  }

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

  // Download backup codes
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

  // Handle skip backup codes
  const handleSkipBackup = () => {
    setStep('success')
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  // Handle download and continue
  const handleDownloadAndContinue = () => {
    handleDownloadBackupCodes()
    setStep('success')
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-surface-container rounded-2xl p-8 max-w-lg w-full mx-4 border border-outline-variant/10 shadow-2xl animate-scale-in">
        {/* Loading Step */}
        {step === 'loading' && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <span className="material-symbols-outlined text-primary text-3xl">security</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface">Configurando MFA...</h3>
            <p className="text-sm text-on-surface-variant">Aguarde enquanto configuramos a autenticação em duas etapas.</p>
          </div>
        )}

        {/* QR Code Step */}
        {step === 'qr' && qrData && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">qr_code_scanner</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface">Escaneie o Código QR</h3>
              <p className="text-sm text-on-surface-variant mt-2">
                Use Google Authenticator, Authy ou outro app similar.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl flex justify-center">
              {qrData.totp?.qr_code_url ? (
                <img src={qrData.totp.qr_code_url} alt="QR Code MFA" className="w-48 h-48" />
              ) : (
                <div className="text-center">
                  <p className="text-sm text-on-surface-variant mb-2">QR Code não disponível</p>
                  <p className="text-xs text-on-surface-variant/60">Use a chave manual abaixo</p>
                </div>
              )}
            </div>

            {qrData.totp?.secret && (
              <div className="bg-surface-container-lowest p-4 rounded-xl">
                <p className="text-[10px] font-bold text-primary uppercase mb-1">Chave Secreta (digite manualmente):</p>
                <code className="text-sm break-all text-on-surface font-mono bg-surface-container px-2 py-1 rounded">
                  {qrData.totp.secret}
                </code>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
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

        {/* Backup Codes Step */}
        {step === 'backup' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-success text-3xl">key</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface">Códigos de Backup</h3>
              <p className="text-sm text-on-surface-variant mt-2">
                Salve estes códigos em um local seguro. Eles podem ser usados se você perder o acesso ao autenticador.
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
                onClick={handleDownloadAndContinue}
                className="flex-1 bg-primary-container text-on-primary-fixed py-3 rounded-xl font-bold text-sm"
              >
                Baixar e Continuar
              </button>
              <button
                onClick={handleSkipBackup}
                className="flex-1 bg-surface-container text-on-surface py-3 rounded-xl font-bold text-sm"
              >
                Pular
              </button>
            </div>

            <p className="text-[10px] text-on-surface-variant/60 text-center">
              Você pode baixar os códigos agora ou mais tarde nas configurações.
            </p>
          </div>
        )}

        {/* Success Step */}
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
          </div>
        )}
      </div>
    </div>
  )
}
