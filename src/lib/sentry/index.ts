/**
 * Sentry Utilities
 * 
 * Funções utilitárias para integração com Sentry
 * @see https://docs.sentry.io/platforms/javascript/
 */
import * as Sentry from '@sentry/react'

/**
 * Configura o escopo do Sentry com informações adicionais
 */
export const setSentryScope = (options: {
  user?: {
    id: string
    email?: string
    username?: string
  }
  tags?: Record<string, string>
  extras?: Record<string, unknown>
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
}) => {
  Sentry.configureScope((scope) => {
    if (options.user) {
      scope.setUser(options.user)
    }
    if (options.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }
    if (options.extras) {
      Object.entries(options.extras).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
    if (options.level) {
      scope.setLevel(options.level)
    }
  })
}

/**
 * Limpa o escopo do Sentry
 */
export const clearSentryScope = () => {
  Sentry.configureScope((scope) => {
    scope.clear()
  })
}

/**
 * Adiciona um breadcrumb (trilha de navegação)
 * @see https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/
 */
export const addBreadcrumb = (message: string, data?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  })
}

/**
 * Captura uma mensagem de log
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level)
}

/**
 * Captura uma exceção
 */
export const captureException = (error: Error, context?: {
  tags?: Record<string, string>
  extras?: Record<string, unknown>
}) => {
  if (context?.tags || context?.extras) {
    Sentry.withScope((scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      }
      if (context?.extras) {
        Object.entries(context.extras).forEach(([key, value]) => {
          scope.setExtra(key, value)
        })
      }
      Sentry.captureException(error)
    })
  } else {
    Sentry.captureException(error)
  }
}

/**
 * Inicia um span de performance
 * @see https://docs.sentry.io/platforms/javascript/performance/
 */
export const startTransaction = (name: string, op?: string) => {
  return Sentry.startSpan({
    name,
    op: op || 'custom',
  })
}

/**
 * Define o nome da transação atual
 */
export const setTransactionName = (name: string) => {
  Sentry.setContext('transaction', { name })
}

/**
 * Feedback do usuário para Sentry
 * @see https://docs.sentry.io/platforms/javascript/user-feedback/
 */
export const showSentryFeedback = () => {
  Sentry.showReportDialog()
}

/**
 * Configura contexto de performance
 */
export const setPerformanceMark = (name: string) => {
  performance.mark(name)
}

/**
 * Mede tempo entre marks
 */
export const measurePerformance = (startMark: string, endMark: string) => {
  const measure = performance.measure('measure', startMark, endMark)
  return measure.duration
}

export default {
  setSentryScope,
  clearSentryScope,
  addBreadcrumb,
  captureMessage,
  captureException,
  startTransaction,
  setTransactionName,
  showSentryFeedback,
  setPerformanceMark,
  measurePerformance,
}
