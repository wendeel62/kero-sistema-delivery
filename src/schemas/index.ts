// ============================================
// SCHEMAS ZOD - CENTRALIZADOR DE VALIDAÇÃO
// Projeto Kero - Sistema de Gestão para Lanchonetes
// ============================================

// Exportação de todos os schemas do projeto
// Uso: import { usuarioSchema, produtoSchema, pedidoSchema } from '@/schemas'

// --------------------
// TENANT / EMPRESA
// --------------------
export * from './tenantSchema'

// --------------------
// USUÁRIOS E AUTENTICAÇÃO
// --------------------
export * from './usuarioSchema'

// --------------------
// CATEGORIAS
// --------------------
export * from './categoriaSchema'

// --------------------
// PRODUTOS
// --------------------
export * from './produtoSchema'

// --------------------
// MESAS
// --------------------
export * from './mesaSchema'

// --------------------
// PEDIDOS
// --------------------
export * from './pedidoSchema'
export * from './pedidoManualSchema'

// --------------------
// CLIENTES
// --------------------
export * from './clienteSchema'

// --------------------
// INGREDIENTES / ESTOQUE
// --------------------
export * from './ingredienteSchema'

// --------------------
// CUPONS / PROMOÇÕES
// --------------------
export * from './cupomSchema'

// --------------------
// MOTOBOYS / ENTREGADORES
// --------------------
export * from './motoboySchema'

// --------------------
// FORNECEDORES
// --------------------
export * from './fornecedorSchema'

// ============================================
// HELPERS DE VALIDAÇÃO
// ============================================

import { z } from 'zod'

/**
 * Valida dados usando um schema Zod
 * @returns { success: boolean, data?: T, error?: z.ZodError }
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  error?: string
} {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
  return { success: false, error: errors }
}

/**
 * Cria um schema para uma API response genérica
 */
export function apiResponseSchema<T extends z.ZodSchema>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  })
}

/**
 * Schema para paginação
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
})

/**
 * Schema para filtros genéricos
 */
export const filtrosSchema = z.object({
  busca: z.string().optional(),
  ativo: z.boolean().optional(),
  status: z.string().optional(),
  tipo: z.string().optional(),
  categoria_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional()
}).merge(paginationSchema)

export type Pagination = z.infer<typeof paginationSchema>
export type Filtros = z.infer<typeof filtrosSchema>