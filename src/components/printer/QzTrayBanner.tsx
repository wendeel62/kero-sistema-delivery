import { useState, useEffect } from 'react'
import { usePrinter } from '@/contexts/PrinterContext'

const LS_DISMISSED_PERM = 'qz_banner_dismissed_permanent'

const QZ_DOWNLOAD_URL = '/Kero-Printer-Setup.exe'

export function QzTrayBanner() {
  const printer = usePrinter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!printer.isConnected && localStorage.getItem(LS_DISMISSED_PERM) !== 'true') {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [printer.isConnected])

  const handleDismiss = () => {
    localStorage.setItem(LS_DISMISSED_PERM, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#252830] border border-[#303030] animate-fade-in-up">
      <div className="flex items-center gap-2.5 text-sm text-gray-300">
        <span className="material-symbols-outlined text-[18px] text-[#e8391a]">print</span>
        <span>
          Impressão automática precisa do{' '}
          <strong className="text-white">QZ Tray</strong>.{' '}
          <a
            href={QZ_DOWNLOAD_URL}
            download="Kero-Printer-Setup.exe"
            className="text-[#e8391a] hover:text-white underline underline-offset-2 font-medium transition-colors"
          >
            Baixar agora
          </a>
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-gray-500 hover:text-white transition-colors"
        title="Fechar"
        aria-label="Fechar"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  )
}
