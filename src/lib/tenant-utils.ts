import { supabase } from "./supabase"

/**
 * Obtém o tenant_id do usuário atual autenticado
 * @throws Error se usuário não estiver autenticado ou não tiver tenant_id
 */
export async function getCurrentTenantId(): Promise<string> {
  const { data: { session: cachedSession } } = await supabase.auth.getSession()
  
  if (!cachedSession) {
    throw new Error("Usuário não autenticado. Faça login para continuar.")
  }
  
  const tenantId = cachedSession.user?.user_metadata?.tenant_id as string | undefined
  
  if (!tenantId) {
    throw new Error("Usuário não possui tenant_id associado. Contacte o administrador.")
  }
  
  return tenantId
}

/**
 * Verifica se existe um tenant_id válido para o usuário atual
 * @returns true se o usuário tem um tenant_id válido
 */
export async function hasTenantId(): Promise<boolean> {
  try {
    await getCurrentTenantId()
    return true
  } catch {
    return false
  }
}

/**
 * Obtém o tenant_id de forma segura, retornando null se não autenticado
 * @returns tenant_id ou null
 */
export async function getCurrentTenantIdSafe(): Promise<string | null> {
  try {
    return await getCurrentTenantId()
  } catch {
    return null
  }
}

/**
 * Aplica filtro de tenant_id a uma query
 * @param query - Query do Supabase
 * @param tenantId - ID do tenant (opcional, busca automaticamente se não informado)
 * @returns Query com filtro aplicado
 */
export function withTenantFilter<T>(
  query: any,
  tenantId?: string
): any {
  return query.eq("tenant_id", tenantId)
}

/**
 * Valida que um registro pertence ao tenant atual
 * @param record - Registro do banco de dados
 * @returns true se o registro pertence ao tenant atual
 */
export async function recordBelongsToCurrentTenant(record: { tenant_id?: string }): Promise<boolean> {
  try {
    const currentTenantId = await getCurrentTenantId()
    return record.tenant_id === currentTenantId
  } catch {
    return false
  }
}

/**
 * Valida que uma lista de registros pertence ao tenant atual
 * @param records - Lista de registros
 * @returns Array apenas com registros do tenant atual
 */
export async function filterRecordsByCurrentTenant<T extends { tenant_id?: string }>(
  records: T[]
): Promise<T[]> {
  try {
    const currentTenantId = await getCurrentTenantId()
    return records.filter((r) => r.tenant_id === currentTenantId)
  } catch {
    return []
  }
}

/**
 * Cria um objeto de filtro de tenant para ser usado em queries
 * @returns Objeto com filtro tenant_id
 */
export async function getTenantFilter() {
  const tenant_id = await getCurrentTenantId()
  return { tenant_id }
}

/**
 * Middleware de segurança para garantir tenant_id em operações de mutation
 * @param originalData - Dados originais da operação
 * @returns Dados com tenant_id garantido
 */
export async function secureMutationData<T extends { tenant_id?: string }>(
  originalData: T
): Promise<T> {
  const tenantId = await getCurrentTenantId()
  
  if (!originalData.tenant_id) {
    return { ...originalData, tenant_id: tenantId } as T
  }
  
  if (originalData.tenant_id !== tenantId) {
    throw new Error("Tentativa de modificar dados de outro tenant. Operação bloqueada.")
  }
  
  return originalData
}

/**
 * Verifica se o usuário tem permissão para acessar um recurso específico
 * @param resourceTenantId - tenant_id do recurso
 * @returns true se o usuário pode acessar
 */
export async function canAccessResource(resourceTenantId: string): Promise<boolean> {
  try {
    const currentTenantId = await getCurrentTenantId()
    return resourceTenantId === currentTenantId
  } catch {
    return false
  }
}

/**
 * Retorna erro de acesso negado para tenant
 */
export class TenantAccessDeniedError extends Error {
  constructor(message = "Acesso negado. Você não tem permissão para acessar este recurso.") {
    super(message)
    this.name = "TenantAccessDeniedError"
  }
}

/**
 * Lança erro se o usuário não tiver tenant_id
 * @throws TenantAccessDeniedError se não tiver acesso
 */
export async function requireTenantId(): Promise<void> {
  const id = await getCurrentTenantIdSafe()
  if (!id) {
    throw new TenantAccessDeniedError("Acesso restrito a usuários com tenant.")
  }
}

export interface TenantAwareQuery {
  tenant_id: string
}

/**
 * Tipo para registros que suportam filtro de tenant
 */
export type TenantAwareRecord<T = unknown> = T & { tenant_id: string }

export const tenantUtils = {
  getCurrentTenantId,
  hasTenantId,
  getCurrentTenantIdSafe,
  withTenantFilter,
  recordBelongsToCurrentTenant,
  filterRecordsByCurrentTenant,
  getTenantFilter,
  secureMutationData,
  canAccessResource,
  requireTenantId,
  TenantAccessDeniedError,
}