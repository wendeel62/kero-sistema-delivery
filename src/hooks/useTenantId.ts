import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

const TENANT_SOURCES = ['user_metadata', 'app_metadata'] as const

export function useTenantId(): string | null {
  const { user } = useAuth()

  const tenantId = useMemo(() => {
    if (!user) return null
    for (const source of TENANT_SOURCES) {
      const meta = user[source]
      if (meta && typeof meta.tenant_id === 'string' && meta.tenant_id.trim()) {
        return meta.tenant_id.trim()
      }
    }
    return null
  }, [user])

  return tenantId
}

export function useRequiredTenantId(): string {
  const tenantId = useTenantId()
  if (!tenantId) {
    throw new Error('No tenant ID available. User must be authenticated and associated with a tenant.')
  }
  return tenantId
}
