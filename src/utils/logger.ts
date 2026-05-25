/**
 * Logger Utility
 * 
 * Utilitário de logging para o Kero Delivery
 * - Logs estruturados com níveis (debug, info, warn, error)
 * - Contexto adicional em cada log
 * - Integração com Sentry em produção
 * - Console formatado em desenvolvimento
 * 
 * @example
 * ```typescript
 * import { logger } from '@/utils/logger'
 * 
 * logger.info('Pedido criado', { orderId: '123', userId: '456' })
 * logger.error('Falha no pagamento', { error, orderId: '123' })
 * ```
 */

import * as Sentry from '@sentry/react'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

export interface LoggerConfig {
  /** Prefixo para identificar a origem dos logs */
  prefix?: string
  /** Nível mínimo de log (padrão: 'debug' em dev, 'info' em prod) */
  minLevel?: LogLevel
  /** Habilitar cores no console (padrão: true em dev) */
  colors?: boolean
}

class LoggerClass {
  private config: LoggerConfig = {
    prefix: 'Kero',
    minLevel: import.meta.env.DEV ? 'debug' : 'info',
    colors: import.meta.env.DEV,
  }

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  /**
   * Configura o logger
   */
  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * Método principal de log
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    // Verifica se o nível deve ser logado
    if (this.levelPriority[level] < this.levelPriority[this.config.minLevel || 'debug']) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    // Em desenvolvimento: console formatado
    if (import.meta.env.DEV) {
      this.printToConsole(entry)
    }

    // Em produção: envia erros para o Sentry
    if (import.meta.env.PROD && level === 'error') {
      this.sendToSentry(entry)
    }

    // Em produção: armazena logs em memória para debugging (opcional)
    if (import.meta.env.PROD) {
      this.storeLog(entry)
    }
  }

  /**
   * Imprime no console formatado
   */
  private printToConsole(entry: LogEntry) {
    const { prefix, colors } = this.config
    const { level, message, timestamp, context } = entry

    const prefixStr = prefix ? `[${prefix}]` : ''
    const levelStr = level.toUpperCase()
    const timeStr = new Date(timestamp).toLocaleTimeString('pt-BR')

    // Cores do console
    const colorMap: Record<LogLevel, string> = {
      debug: '\x1b[36m',    // cyan
      info: '\x1b[32m',     // green
      warn: '\x1b[33m',     // yellow
      error: '\x1b[31m',    // red
    }

    const reset = '\x1b[0m'
    const color = colors ? colorMap[level] : ''

    const logFn = (console as unknown as Record<string, unknown>)[level === 'debug' ? 'log' : level] || console.warn
    const contextStr = context ? '\n' + JSON.stringify(context, null, 2) : ''

    if (colors) {
      (logFn as (...args: unknown[]) => void)(`${color}${prefixStr}${reset} [${timeStr}] ${color}${levelStr}${reset} - ${message}${contextStr}`)
    } else {
      (logFn as (...args: unknown[]) => void)(`${prefixStr} [${timeStr}] ${levelStr} - ${message}${contextStr}`)
    }
  }

  /**
   * Envia erro para o Sentry
   */
  private sendToSentry(entry: LogEntry) {
    const { message, context, timestamp } = entry

    Sentry.withScope((scope) => {
      // Adiciona contexto adicional
      scope.setExtra('timestamp', timestamp)
      scope.setLevel('error')

      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value)
        })
      }

      // Captura a erro
      const error = new Error(message)
      Sentry.captureException(error, {
        tags: {
          source: 'logger',
          level: message,
        },
      })
    })
  }

  /**
   * Armazena log em memória (para debugging em produção)
   */
  private storeLog(entry: LogEntry) {
    // Implementação opcional: armazenar últimos N logs em memória
    // ou enviar para serviço de logging
    if (typeof window !== 'undefined') {
      const storageKey = 'kero_logs'
      const maxLogs = 100
      
      let logs: LogEntry[] = []
      try {
        const stored = sessionStorage.getItem(storageKey)
        if (stored) {
          logs = JSON.parse(stored)
        }
      } catch {
        // Ignora erros de storage
      }

      logs.push(entry)
      
      // Mantém apenas os últimos logs
      if (logs.length > maxLogs) {
        logs = logs.slice(logs.length - maxLogs)
      }

      try {
        sessionStorage.setItem(storageKey, JSON.stringify(logs))
      } catch {
        // Ignora erros de storage
      }
    }
  }

  /**
   * Log de debug
   */
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
  }

  /**
   * Log de informação
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  /**
   * Log de aviso
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  /**
   * Log de erro
   */
  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context)
  }

  /**
   * Cria um logger com prefixo personalizado
   */
  createChild(prefix: string): LoggerClass {
    const child = new LoggerClass()
    child.configure({ prefix })
    return child
  }

  /**
   * Recupera logs armazenados (apenas produção)
   */
  getStoredLogs(): LogEntry[] {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const stored = sessionStorage.getItem('kero_logs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Limpa logs armazenados
   */
  clearStoredLogs() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('kero_logs')
    }
  }
}

// Instância padrão do logger
export const logger = new LoggerClass()

// Logger para módulos específicos
export const createLogger = (prefix: string) => logger.createChild(prefix)

// Exportações para conveniência
export { LoggerClass as Logger }

export default logger
