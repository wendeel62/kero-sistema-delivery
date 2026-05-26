import { createContext, useContext, type ReactNode } from 'react'
import { usePwaInstall, type UsePwaInstallReturn } from '../hooks/usePwaInstall'
import { usePwaUpdate, type UsePwaUpdateReturn } from '../hooks/usePwaUpdate'

export interface PwaContextType extends UsePwaInstallReturn, UsePwaUpdateReturn {}

const PwaContext = createContext<PwaContextType | undefined>(undefined)

export function PwaProvider({ children }: { children: ReactNode }) {
  const install = usePwaInstall()
  const update = usePwaUpdate()

  return (
    <PwaContext.Provider value={{ ...install, ...update }}>
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (context === undefined) {
    throw new Error('usePwa must be used within PwaProvider')
  }
  return context
}
