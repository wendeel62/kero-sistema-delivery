import { useState, useEffect, useCallback } from 'react'
import { usePwa } from '../../contexts/PwaContext'
import { usePrinter } from '../../hooks/usePrinter'
import { QzTrayOnboardingModal } from '../printer/QzTrayOnboardingModal'

const LS_QZ_DISMISSED = 'qz_onboarding_dismissed'

function isDesktop(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return /win|mac|linux/.test(ua)
}

function getOS(): 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'other' {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/win/.test(ua)) return 'windows'
  if (/mac/.test(ua)) return 'mac'
  if (/linux/.test(ua)) return 'linux'
  return 'other'
}

function getBrowser(): 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'other' {
  const ua = navigator.userAgent.toLowerCase()
  if (/edg\//.test(ua)) return 'edge'
  if (/chrome/.test(ua) && !/edg\//.test(ua)) return 'chrome'
  if (/safari/.test(ua) && !/chrome/.test(ua)) return 'safari'
  if (/firefox/.test(ua)) return 'firefox'
  if (/samsungbrowser/.test(ua)) return 'samsung'
  return 'other'
}

const OS = getOS()
const browser = getBrowser()

export function PwaInstallPrompt() {
  const { isInstallable, isInstalled, install, dismissInstall, justInstalled, clearJustInstalled } = usePwa()
  const printer = usePrinter()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showQzOnboarding, setShowQzOnboarding] = useState(false)

  useEffect(() => {
    if (!justInstalled || printer.isConnected) return
    if (localStorage.getItem(LS_QZ_DISMISSED)) return
    if (!isDesktop()) return
    const timer = setTimeout(() => setShowQzOnboarding(true), 3000)
    return () => clearTimeout(timer)
  }, [justInstalled, printer.isConnected])

  const handleQzOnboardingClose = useCallback(() => {
    setShowQzOnboarding(false)
    clearJustInstalled()
  }, [clearJustInstalled])

  const handleInstall = useCallback(async () => {
    setInstalling(true)
    const success = await install()
    if (success) setInstalling(false)
    setInstalling(false)
  }, [install])

  const handleDismiss = useCallback(() => {
    dismissInstall(dontShowAgain)
  }, [dismissInstall, dontShowAgain])

  if (isInstalled && showQzOnboarding) {
    return <QzTrayOnboardingModal onClose={handleQzOnboardingClose} />
  }

  if (isInstalled) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Instalar Kero Delivery"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm md:max-w-md mt-[12vh] mb-8 mx-4 bg-surface-container text-on-background rounded-3xl shadow-2xl border border-outline/20 overflow-hidden self-start">
        <div className="p-6 pb-4 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm overflow-hidden">
            <img
              src="/icons/icon-192x192.png"
              alt="Kero Delivery"
              className="w-14 h-14 rounded-xl"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold">Instale o Kero Delivery</h2>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              Acesso rápido com um clique, suporte offline e experiência de aplicativo nativo.
            </p>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-3">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full h-12 bg-primary hover:bg-primary-bright text-white font-bold rounded-xl text-base transition-all active:scale-[0.98] shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {installing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">download</span>
            )}
            {installing ? 'Instalando...' : 'Instalar Agora'}
          </button>

          <div className="bg-surface-dim/50 rounded-xl p-3.5 border border-outline/20 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant text-center">
              {isInstallable ? 'Instalação manual' : 'Como instalar'}
            </p>
            <div className="space-y-2">
              {(OS === 'windows' || OS === 'mac' || OS === 'linux') &&
                (browser === 'chrome' || browser === 'edge') && (
                  <InstructionRow icon="desktop_windows" label="Desktop">
                    Clique no ícone de instalação{' '}
                    <span className="inline-flex items-center gap-0.5 text-primary font-semibold">
                      {browser === 'edge' ? '…' : '⋮'}
                    </span>{' '}
                    na barra de endereços e selecione "Instalar"
                  </InstructionRow>
                )}
              {OS === 'android' && (
                <InstructionRow icon="smartphone" label="Android">
                  Toque no menu{' '}
                  <span className="text-primary font-semibold">⋮</span> &gt;{' '}
                  <span className="text-primary font-semibold">Adicionar à tela inicial</span>
                </InstructionRow>
              )}
              {OS === 'ios' && (
                <InstructionRow icon="tablet_iphone" label="iPhone / iPad">
                  Toque em{' '}
                  <span className="text-primary font-semibold">Compartilhar</span> &gt;{' '}
                  <span className="text-primary font-semibold">Adicionar à Tela de Início</span>
                </InstructionRow>
              )}
              {OS === 'other' && browser === 'other' && (
                <InstructionRow icon="install_mobile" label="Instalar">
                  Use o menu do navegador para adicionar o app à tela inicial
                </InstructionRow>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex flex-col items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-outline text-primary focus:ring-primary/30 cursor-pointer accent-primary"
            />
            <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">
              Não mostrar novamente
            </span>
          </label>

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

function InstructionRow({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 text-xs text-on-surface-variant">
      <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0 text-primary">
        {icon}
      </span>
      <div>
        <span className="font-semibold text-on-surface">{label}:</span>{' '}
        {children}
      </div>
    </div>
  )
}
