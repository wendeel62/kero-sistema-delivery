import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Registro do Service Worker PWA
// O vite-plugin-pwa com registerType 'autoUpdate' injeta registerSW.js automaticamente em produção.
// Este bloco complementa com lógica de atualização para o usuário em produção.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.ready.then((registration) => {
      console.log('[PWA] Service Worker ativo, scope:', registration.scope)

      // Escutar atualizações do Service Worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão disponível — notificar o usuário
            console.log('[PWA] Nova versão do Service Worker instalada.')
            const shouldReload = window.confirm(
              'Uma nova versão do Kero está disponível! Deseja atualizar agora?'
            )
            if (shouldReload) {
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          }
        })
      })
    }).catch((error) => {
      console.warn('[PWA] Service Worker não disponível:', error)
    })

    // Escutar troca de controller (após skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Controller do Service Worker atualizado.')
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
