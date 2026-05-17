import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isMfaRequired } from '../schemas/auth'

type UserRole = 'super_admin' | 'admin' | 'editor' | 'user' | 'consultor' | 'motoboy' | 'cozinha' | null

// Role-based route configuration
const ROLE_ROUTES: Record<string, UserRole[]> = {
  '/admin': ['super_admin'],
  '/cozinha': ['super_admin', 'admin', 'editor', 'cozinha'],
  '/motoboy': ['super_admin', 'admin', 'editor', 'motoboy'],
  '/financeiro': ['super_admin', 'admin', 'editor', 'consultor'],
  '/clientes': ['super_admin', 'admin', 'editor', 'consultor'],
}

// Default routes accessible to internal users
const DEFAULT_INTERNAL_ROUTES = ['super_admin', 'admin', 'editor']

export function hasAccess(currentPath: string, role: UserRole): boolean {
  if (!role) return false

  const allowedRoles = ROLE_ROUTES[currentPath]
  if (allowedRoles) {
    return allowedRoles.includes(role as any)
  }

  // For other internal routes, allow super_admin, admin, editor
  return DEFAULT_INTERNAL_ROUTES.includes(role as any)
}

/**
 * ProtectedRoute - Componente de proteção de rotas
 * 
 * - Verifica se usuário está autenticado
 * - Para roles 'admin' e 'super_admin', exige MFA obrigatório
 * - Se MFA não estiver configurado, redireciona para /mfa-setup
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role, mfaConfig, requiresMfaRedirect } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Check if MFA is required for this role
  const needsMfa = role && isMfaRequired(role)
  const mfaNotConfigured = !mfaConfig?.enabled || !mfaConfig?.verified
  
  if (needsMfa && mfaNotConfigured) {
    // Redirect to MFA setup page
    return <Navigate to="/mfa-setup" replace state={{ from: location }} />
  }

  return <>{children}</>
}

// RoleRoute: Extended route with role-based access control
export function RoleRoute({
  children,
  requiredRoles
}: {
  children: React.ReactNode
  requiredRoles: UserRole[]
}) {
  const { user, loading, role, mfaConfig } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Check if MFA is required for this role
  const needsMfa = role && isMfaRequired(role)
  const mfaNotConfigured = !mfaConfig?.enabled || !mfaConfig?.verified
  
  if (needsMfa && mfaNotConfigured) {
    return <Navigate to="/mfa-setup" replace state={{ from: location }} />
  }

  // Check if user has required role
  if (role && !requiredRoles.includes(role as any)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
