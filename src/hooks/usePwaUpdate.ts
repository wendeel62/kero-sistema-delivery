import { useRegisterSW } from 'virtual:pwa-register/react'

export interface UsePwaUpdateReturn {
  offlineReady: boolean
  needRefresh: boolean
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  close: () => void
}

export function usePwaUpdate(): UsePwaUpdateReturn {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('[PWA] SW registrado:', r.scope)
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Erro ao registrar SW:', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return {
    offlineReady,
    needRefresh,
    updateServiceWorker,
    close,
  }
}
