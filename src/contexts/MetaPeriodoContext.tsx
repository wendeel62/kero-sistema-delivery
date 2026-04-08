import { createContext, useContext, useState, type ReactNode } from 'react'

export type MetaPeriodo = 'dia' | 'semana' | 'mes'

interface MetaPeriodoContextValue {
  periodo: MetaPeriodo
  setPeriodo: (periodo: MetaPeriodo) => void
}

const MetaPeriodoContext = createContext<MetaPeriodoContextValue | undefined>(undefined)

export function MetaPeriodoProvider({ children }: { children: ReactNode }) {
  const [periodo, setPeriodo] = useState<MetaPeriodo>('dia')

  return (
    <MetaPeriodoContext.Provider value={{ periodo, setPeriodo }}>
      {children}
    </MetaPeriodoContext.Provider>
  )
}

export function useMetaPeriodo() {
  const context = useContext(MetaPeriodoContext)
  if (!context) throw new Error('useMetaPeriodo must be used dentro de MetaPeriodoProvider')
  return context
}
