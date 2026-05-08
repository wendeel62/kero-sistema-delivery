import { supabase } from './supabase'

/**
 * Extrai o tenant_id de um objeto de token parseado
 * Tenta múltiplos caminhos comuns onde o tenant_id pode estar armazenado
 * 
 * @param tokenObj - Objeto de token parseado do localStorage/sessionStorage
 * @returns tenant_id ou null se não encontrado
 */
function extractTenantIdFromToken(tokenObj: Record<string, unknown>): string | null {
  if (!tokenObj) return null

  // Helper para extrair de nested properties
  const getStringProp = (obj: unknown, prop: string): string | null => {
    const val = (obj as Record<string, unknown>)?.[prop]
    if (typeof val === 'string' && val.trim()) {
      return val.trim()
    }
    return null
  }

  // Caminhos possíveis onde tenant_id pode estar:
  // Path 1: access_token.user_metadata.tenant_id (Supabase v2)
  const accessToken = tokenObj.access_token as Record<string, unknown>
  if (accessToken?.user_metadata) {
    const result = getStringProp(accessToken.user_metadata, 'tenant_id')
    if (result) return result
  }
  
  // Path 2: user.user_metadata.tenant_id (Supabase v1)
  const user = tokenObj.user as Record<string, unknown>
  if (user?.user_metadata) {
    const result = getStringProp(user.user_metadata, 'tenant_id')
    if (result) return result
  }
  
  // Path 3-7: other paths
  const paths = [
    () => getStringProp(accessToken || {}, 'tenant_id'),
    () => getStringProp(user || {}, 'tenant_id'),
    () => getStringProp(tokenObj, 'tenant_id'),
    () => {
      const metadata = tokenObj.metadata as Record<string, unknown>
      return getStringProp(metadata || {}, 'tenant_id')
    },
    () => {
      const session = tokenObj.session as Record<string, unknown>
      const sessionUser = (session as Record<string, unknown>)?.user as Record<string, unknown>
      return getStringProp(sessionUser || {}, 'tenant_id')
    }
  ]

  for (const getPath of paths) {
    const value = getPath()
    if (value) {
      return value
    }
  }

  return null
}

/**
 * Obtém o tenant_id do usuário autenticado
 * 
 * Ordem de busca:
 * 1. localStorage 'supabase.auth.token'
 * 2. sessionStorage (várias chaves possíveis)
 * 3. localStorage (chaves customizadas)
 * 4. sessionStorage 'tenant_id'
 * 
 * @returns tenant_id do usuário
 * @throws Error se não encontrar tenant_id
 */
export function getTenantId(): string {
  // ====== 1. localStorage 'supabase.auth.token' ======
  const localTokenStr = localStorage.getItem('supabase.auth.token')
  if (localTokenStr) {
    try {
      const tokenObj = JSON.parse(localTokenStr)
      const tenantId = extractTenantIdFromToken(tokenObj)
      if (tenantId) {
        return tenantId
      }
    } catch {
      // Ignora erro de parse e continua para próxima fonte
    }
  }

  // ====== 2. sessionStorage ======
  const sessionKeys = [
    'supabase.auth.token',
    'sb-auth-token',
    'supabase_session',
    'auth_token',
    'tenant_id'
  ]

  for (const key of sessionKeys) {
    const sessionValue = sessionStorage.getItem(key)
    if (sessionValue) {
      try {
        const tokenObj = JSON.parse(sessionValue)
        const tenantId = extractTenantIdFromToken(tokenObj)
        if (tenantId) {
          return tenantId
        }
      } catch {
        // Ignora erro de parse e continua
      }
    }
  }

  // ====== 3. localStorage chaves customizadas ======
  const customKeys = [
    'tenant_id',
    'current_tenant_id',
    'sb-tenant-id',
    'auth_tenant_id',
    'user_tenant_id',
    'restaurant_id'
  ]

  for (const key of customKeys) {
    const value = localStorage.getItem(key)
    if (value && value.trim()) {
      return value.trim()
    }
  }

  // ====== 4. sessionStorage valor direto ======
  const sessionDirectValue = sessionStorage.getItem('tenant_id')
  if (sessionDirectValue && sessionDirectValue.trim()) {
    return sessionDirectValue.trim()
  }

  throw new Error(
    'tenant_id não encontrado. Certifique-se de estar autenticado e ter um tenant associado.'
  )
}

/**
 * Obtém o tenant_id de forma segura, retornando null se não encontrar
 * 
 * @returns tenant_id ou null
 */
export function getTenantIdSafe(): string | null {
  try {
    return getTenantId()
  } catch {
    return null
  }
}

/**
 * Verifica se existe um tenant_id válido
 * 
 * @returns true se tiver tenant_id
 */
export function hasTenantId(): boolean {
  try {
    getTenantId()
    return true
  } catch {
    return false
  }
}
