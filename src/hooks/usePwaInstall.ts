import { useState, useEffect, useCallback, useRef } from 'react'

const LS_KEY_DISMISSED = 'pwa_install_dismissed'
const LS_KEY_DONT_SHOW = 'pwa_install_dont_show'

function getIsInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export interface UsePwaInstallReturn {
  deferredPrompt: BeforeInstallPromptEvent | null
  isInstallable: boolean
  isInstalled: boolean
  isDismissed: boolean
  justInstalled: boolean
  clearJustInstalled: () => void
  install: () => Promise<boolean>
  dismissInstall: (dontShowAgain?: boolean) => void
  canShow: boolean
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(getIsInstalled)
  const [isDismissed, setIsDismissed] = useState(false)
  const [justInstalled, setJustInstalled] = useState(false)
  const promptHandled = useRef(false)

  const checkDismissed = useCallback(() => {
    if (localStorage.getItem(LS_KEY_DONT_SHOW)) return true
    const dismissedAt = localStorage.getItem(LS_KEY_DISMISSED)
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt)
      return elapsed < 7 * 24 * 60 * 60 * 1000
    }
    return false
  }, [])

  useEffect(() => {
    setIsDismissed(checkDismissed())
  }, [checkDismissed])

  useEffect(() => {
    if (isInstalled) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = () => setIsInstalled(mediaQuery.matches)
    mediaQuery.addEventListener('change', onDisplayModeChange)

    const onAppInstalled = () => {
      setIsInstalled(true)
      setJustInstalled(true)
      setDeferredPrompt(null)
      localStorage.removeItem(LS_KEY_DISMISSED)
      localStorage.removeItem(LS_KEY_DONT_SHOW)
    }
    window.addEventListener('appinstalled', onAppInstalled)

    if ((navigator as unknown as { standalone?: boolean }).standalone) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      mediaQuery.removeEventListener('change', onDisplayModeChange)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [isInstalled])

  const install = useCallback(async (): Promise<boolean> => {
    if (import.meta.env.DEV) {
      setIsInstalled(true)
      setJustInstalled(true)
      return true
    }

    if (!deferredPrompt) return false
    if (promptHandled.current) return false
    promptHandled.current = true

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setJustInstalled(true)
      }
      setDeferredPrompt(null)
      return outcome === 'accepted'
    } catch {
      return false
    } finally {
      setTimeout(() => { promptHandled.current = false }, 1000)
    }
  }, [deferredPrompt])

  const dismissInstall = useCallback((dontShowAgain?: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem(LS_KEY_DONT_SHOW, 'true')
    } else {
      localStorage.setItem(LS_KEY_DISMISSED, String(Date.now()))
    }
    setIsDismissed(true)
  }, [])

  const clearJustInstalled = useCallback(() => {
    setJustInstalled(false)
  }, [])

  return {
    deferredPrompt,
    isInstallable: import.meta.env.DEV ? true : deferredPrompt !== null,
    isInstalled,
    isDismissed,
    justInstalled,
    clearJustInstalled,
    install,
    dismissInstall,
    canShow: !isInstalled && !isDismissed && (deferredPrompt !== null || checkDismissed() === false),
  }
}
