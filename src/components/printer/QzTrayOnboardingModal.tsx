import { useState, useCallback } from 'react'

const LS_KEY_DISMISSED = 'qz_onboarding_dismissed'
const QZ_DOWNLOAD_URL = '/Kero-Printer-Setup.exe'

interface QzTrayOnboardingModalProps {
  onClose: () => void
}

export function QzTrayOnboardingModal({ onClose }: QzTrayOnboardingModalProps) {
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setConnectError(null)
    try {
      const { connectPrinter, getAvailablePrinters } = await import('../../services/printService')
      await connectPrinter()
      const printers = await getAvailablePrinters()
      if (printers.length === 0) {
        setConnectError('Nenhuma impressora encontrada no sistema.')
        return
      }
      localStorage.setItem(LS_KEY_DISMISSED, 'true')
      onClose()
    } catch {
      setConnectError(
        'QZ Tray não está em execução ou recusou a conexão. ' +
        'Verifique se o programa está aberto e clique em "Allow" no popup de segurança.'
      )
    } finally {
      setConnecting(false)
    }
  }, [onClose])

  const handleDownload = useCallback(() => {
    setDownloading(true)
    localStorage.setItem(LS_KEY_DISMISSED, 'true')
    const a = document.createElement('a')
    a.href = QZ_DOWNLOAD_URL
    a.download = 'Kero-Printer-Setup.exe'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setDownloading(false), 1000)
  }, [])

  const handleLater = useCallback(() => {
    localStorage.setItem(LS_KEY_DISMISSED, 'true')
    onClose()
  }, [onClose])

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
              O Kero precisa do <strong>QZ Tray</strong> para conectar com as impressoras
              do seu computador e imprimir pedidos automaticamente.
            </p>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-3">
          {connectError && (
            <p className="text-xs text-red-400 text-center">{connectError}</p>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full h-12 bg-primary hover:bg-primary-bright text-white font-bold rounded-xl text-base transition-all active:scale-[0.98] shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">link</span>
            )}
            {connecting ? 'Conectando...' : 'Conectar ao QZ Tray'}
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full h-11 bg-surface-container-high hover:bg-surface-container text-on-surface font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">download</span>
            )}
            {downloading ? 'Baixando...' : 'Baixar instalador'}
          </button>
        </div>

        <div className="px-6 pb-5 flex justify-center">
          <button
            onClick={handleLater}
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface underline underline-offset-2 transition-colors"
          >
            Fazer depois
          </button>
        </div>
      </div>
    </div>
  )
}
