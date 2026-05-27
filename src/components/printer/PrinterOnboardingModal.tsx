import { useState, useCallback } from 'react'

const HELPER_DOWNLOAD_URL = '/Kero-Printer-Setup.exe'
const LS_KEY_DISMISSED = 'printer_onboarding_dismissed'

function isWindows(): boolean {
  return navigator.userAgent.toLowerCase().includes('win')
}

interface PrinterOnboardingModalProps {
  onClose: () => void
  onHelperReady: () => void
}

export function PrinterOnboardingModal({ onClose, onHelperReady }: PrinterOnboardingModalProps) {
  const [checking, setChecking] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'success' | 'error' | null>(null)

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = HELPER_DOWNLOAD_URL
    a.download = 'Kero-Printer-Setup.exe'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const handleVerify = useCallback(async () => {
    setChecking(true)
    setVerifyStatus(null)
    try {
      const res = await fetch('http://localhost:3002/health', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        setVerifyStatus('success')
        setTimeout(() => onHelperReady(), 1200)
      } else {
        setVerifyStatus('error')
      }
    } catch {
      setVerifyStatus('error')
    }
    setChecking(false)
  }, [onHelperReady])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(LS_KEY_DISMISSED, 'true')
    onClose()
  }, [onClose])

  if (!isWindows()) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm md:max-w-md mt-[20vh] mb-8 mx-4 bg-surface-container text-on-background rounded-3xl shadow-2xl border border-outline/20 overflow-hidden self-start">
        <div className="p-6 pb-4 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">print</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Impressão Automática</h2>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
              O Kero precisa de um módulo auxiliar de <strong>3MB</strong> para conectar com as
              impressoras do seu computador e imprimir pedidos automaticamente.
            </p>

            {verifyStatus === 'success' && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
                <span className="text-emerald-400 text-sm font-medium">Módulo detectado! Redirecionando...</span>
              </div>
            )}
            {verifyStatus === 'error' && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-lg">error</span>
                <span className="text-red-400 text-sm">Módulo não encontrado. Baixe e execute o instalador primeiro.</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-4 space-y-3">
          <button
            onClick={handleDownload}
            className="w-full h-12 bg-primary hover:bg-primary-bright text-white font-bold rounded-xl text-base transition-all active:scale-[0.98] shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Baixar Módulo de Impressão
          </button>

          <button
            onClick={handleVerify}
            disabled={checking}
            className="w-full h-11 bg-surface-container-high hover:bg-surface-container text-on-surface font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checking ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            )}
            {checking ? 'Verificando...' : 'Já baixou? Verificar Conexão'}
          </button>
        </div>

        <div className="px-6 pb-5 flex justify-center">
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface underline underline-offset-2 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
