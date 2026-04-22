import { z } from 'zod'

// ============================================
// SCHEMA BASE - USUÁRIO
// ============================================

export const usuarioSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/, 'Telefone inválido').optional().or(z.literal('')),
  role: z.enum(['admin', 'gerente', 'caixa', 'cozinheiro', 'entregador', 'motoboy']).default('caixa'),
  status: z.enum(['ativo', 'inativo', 'pendente', 'bloqueado']).default('pendente'),
  password_hash: z.string().optional(),
  avatar_url: z.string().url('URL inválida').optional().or(z.literal('')),
  permissoes: z.array(z.string()).optional(),
  ultimo_acesso: z.string().datetime().optional(),
  mfa_enabled: z.boolean().default(false),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

// Schema para criação de usuário (sem ID, com password obrigatória)
export const usuarioCreateSchema = usuarioSchema.omit({ id: true, ultimo_acesso: true, created_at: true, updated_at: true }).extend({
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres')
})

// Schema para atualização de usuário
export const usuarioUpdateSchema = usuarioSchema.omit({ tenant_id: true, created_at: true }).partial().extend({
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').optional()
})

// Schema para login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  tenant_id: z.string().uuid('ID do tenant inválido').optional(),
  codigo_mfa: z.string().length(6, 'Código MFA deve ter 6 dígitos').optional()
})

export type Usuario = z.infer<typeof usuarioSchema>
export type UsuarioCreate = z.infer<typeof usuarioCreateSchema>
export type UsuarioUpdate = z.infer<typeof usuarioUpdateSchema>
export type LoginInput = z.infer<typeof loginSchema>