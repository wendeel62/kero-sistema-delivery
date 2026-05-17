import { useEffect, useState } from 'react'

interface LoadingSpinnerProps {
  delay?: number
  minDelay?: number
}

/**
 * Loading Spinner com delay mínimo para evitar flicker
 * e transição suave entre rotas
 */
export function LoadingSpinner({ delay = 0, minDelay = 300 }: LoadingSpinnerProps = {}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true)
    }, delay)

    const minTimer = setTimeout(() => {
      setShow(true)
    }, minDelay)

    return () => {
      clearTimeout(timer)
      clearTimeout(minTimer)
    }
  }, [delay, minDelay])

  if (!show) {
    return null
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-surface-container/80 backdrop-blur-sm z-50"
      role="status"
      aria-label="Carregando"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinner principal */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>

        {/* Texto de carregamento */}
        <p className="text-on-surface-variant font-medium text-sm animate-pulse">
          Carregando...
        </p>

        {/* Barra de progresso indeterminada */}
        <div className="w-32 h-1 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-loading-bar" />
        </div>
      </div>
    </div>
  )
}

/**
 * Loading Skeleton para conteúdo
 */
export function LoadingSkeleton({
  className = '',
  width,
  height,
}: {
  className?: string
  width?: string | number
  height?: string | number
}) {
  return (
    <div
      className={`animate-pulse bg-surface-container-high rounded ${className}`}
      style={{ width, height }}
    />
  )
}

/**
 * Loading Skeleton para linhas de tabela
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <LoadingSkeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-4 w-3/4" />
            <LoadingSkeleton className="h-3 w-1/2" />
          </div>
          <LoadingSkeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

export default LoadingSpinner
