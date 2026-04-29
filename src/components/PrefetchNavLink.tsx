import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useCallback } from 'react'

interface PrefetchNavLinkProps {
  to: string
  end?: boolean
  children: (props: { isActive: boolean }) => React.ReactNode
  onClick?: () => void
  className?: string | ((props: { isActive: boolean }) => string)
}

// Páginas mais acessadas - preload prioritário
const HIGH_PRIORITY_PAGES = [
  '/pedidos',
  '/pdv',
  '/clientes',
  '/financeiro',
]

export function PrefetchNavLink({ 
  to, 
  end, 
  children, 
  onClick, 
  className 
}: PrefetchNavLinkProps) {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    
    // Prefetch imediato para páginas de alta prioridade
    if (HIGH_PRIORITY_PAGES.includes(to)) {
      // Usa link prefetch nativos do browser
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = to
      link.as = 'document'
      document.head.appendChild(link)
    }
  }, [to])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const handleClick = useCallback(() => {
    // Navegação instantânea para páginas já pré-carregadas
    if (HIGH_PRIORITY_PAGES.includes(to)) {
      // Preload agressivo ao clicar
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'document'
      link.href = to
      document.head.appendChild(link)
    }
    onClick?.()
  }, [to, onClick])

  return (
    <NavLink
      to={to}
      end={end}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={className as any}
    >
      {children}
    </NavLink>
  )
}

export default PrefetchNavLink