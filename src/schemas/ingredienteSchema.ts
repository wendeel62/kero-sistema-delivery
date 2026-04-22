import { z } from 'zod'

// ============================================
// SCHEMA BASE - INGREDIENTE
// ============================================

export const ingredienteSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  fornecedor_id: z.string().uuid().optional(),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200, 'Nome muito longo'),
  descricao: z.string().max(500).optional(),
  unidade: z.enum(['kg', 'g', 'lt', 'ml', 'un', 'cx', 'pc', 'dz'] as [string, ...string[]]),
  categoria: z.string().max(100).optional(),
  estoque_atual: z.number().min(0, 'Estoque não pode ser negativo').default(0),
  estoque_minimo: z.number().min(0, 'Estoque mínimo não pode ser negativo').default(0),
  estoque_maximo: z.number().min(0, 'Estoque máximo não pode ser negativo').optional(),
  custo_medio: z.number().min(0, 'Custo não pode ser negativo').optional(),
  custo_ultima_compra: z.number().min(0).optional(),
  local_armazenamento: z.string().max(100).optional(),
  ativo: z.boolean().default(true),
  validade: z.string().datetime().optional(),
  observacoes: z.string().max(500).optional(),
  last_update: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const ingredienteCreateSchema = ingredienteSchema.omit({ id: true, last_update: true, created_at: true, updated_at: true })
export const ingredienteUpdateSchema = ingredienteSchema.omit({ tenant_id: true, created_at: true }).partial()

export type Ingrediente = z.infer<typeof ingredienteSchema>
export type IngredienteCreate = z.infer<typeof ingredienteCreateSchema>
export type IngredienteUpdate = z.infer<typeof ingredienteUpdateSchema>
