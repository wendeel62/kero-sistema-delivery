import { z } from 'zod'

// ============================================
// MFA SCHEMAS
// ============================================

/**
 * Schema para validação de código MFA
 * Deve ter exatamente 6 dígitos numéricos
 */
export const mfaCodeSchema = z
  .string()
  .length(6, 'Código deve ter 6 dígitos')
  .regex(/^\d{6}$/, 'Código deve conter apenas números')

/**
 * Schema para setup de MFA
 */
export const mfaSetupSchema = z.object({
  code: mfaCodeSchema,
  secret: z.string().min(1, 'Secret é obrigatório'),
  qrCodeUrl: z.string().url().optional()
})

/**
 * Schema para verificar se MFA é obrigatório
 * Roles que exigem MFA: admin, super_admin
 */
export const MFA_REQUIRED_ROLES = ['admin', 'super_admin'] as const

/**
 * Verifica se o role exige MFA obrigatório
 */
export function isMfaRequired(role: string | null): boolean {
  if (!role) return false
  return MFA_REQUIRED_ROLES.includes(role as any)
}

/**
 * Schema para login com MFA
 */
export const loginWithMfaSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  mfaCode: mfaCodeSchema.optional()
})

/**
 * Schema para backup codes
 */
export const backupCodesSchema = z.array(
  z.string().regex(/^[A-Z0-9]{8}$/, 'Código de backup inválido')
)

// ============================================
// USER SCHEMAS
// ============================================

/**
 * Schema para usuário com informações MFA
 */
export const userWithMfaSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['super_admin', 'admin', 'editor', 'user', 'consultor', 'motoboy', 'cozinha']),
  mfaEnabled: z.boolean().default(false),
  mfaVerified: z.boolean().default(false),
  backupCodes: backupCodesSchema.optional()
})

// ============================================
// TYPES
// ============================================

export type MfaCode = z.infer<typeof mfaCodeSchema>
export type MfaSetup = z.infer<typeof mfaSetupSchema>
export type LoginWithMfa = z.infer<typeof loginWithMfaSchema>
export type BackupCodes = z.infer<typeof backupCodesSchema>
export type UserWithMfa = z.infer<typeof userWithMfaSchema>
