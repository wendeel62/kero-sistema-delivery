import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App'

// ============================================
// Sentry Initialization
// ============================================
const sentryDsn = import.meta.env.VITE_SENTRY_DSN

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Performance Monitoring
    tracesSampleRate: 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment
    environment: import.meta.env.MODE || 'development',

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'],
      }),
    ],

    // Before Send Hook - Add additional context
    beforeSend(event, _hint) {
      // Don't send events in development mode
      if (import.meta.env.DEV) {
        console.warn('[Sentry] Event captured (not sent in dev):', event)
        return null
      }
      return event
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'canvas.contentDocument',
      // Network errors
      'NetworkError',
      'Network request failed',
      // Random plugins/extensions
      'atomicFindClose',
      'fb_random_ride',
    ],
  })
} else {
  console.warn('[Sentry] DSN not configured, skipping initialization')
}

// ============================================
// Error Boundary Component
// ============================================
function ErrorFallback({ error, resetError }: { error: Error; resetError?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-center text-gray-800">
          Oops! Algo deu errado
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">
          Desculpe, ocorreu um erro inesperado. Nossa equipe foi notificada.
        </p>
        
        {import.meta.env.DEV && error && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.toString()}
            </p>
          </div>
        )}
        
        <div className="mt-6">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-red-600 hover:text-red-700"
          >
            Voltar para o início
          </a>
        </div>
      </div>
    </div>
  )
}

// ============================================
// App Wrapper with Error Boundary
// ============================================
function AppWithErrorBoundary() {
  return (
    <Sentry.ErrorBoundary
      fallback={(fallbackProps) => {
        const error = (fallbackProps as any).error
        const resetError = (fallbackProps as any).resetError
        return <ErrorFallback error={error} resetError={resetError} />
      }}
      beforeCapture={(scope) => {
        scope.setLevel('error')
        scope.setTag('component', 'App')
      }}
    >
      <App />
    </Sentry.ErrorBoundary>
  )
}

// ============================================
// Render Application
// ============================================
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithErrorBoundary />
  </StrictMode>,
)
