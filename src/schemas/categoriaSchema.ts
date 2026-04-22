import { z } from 'zod'

// ============================================
// SCHEMA BASE - CATEGORIA
// ============================================

export const categoriaSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  descricao: z.string().max(500, 'Descrição muito longa').optional(),
  ordem: z.number().int().min(0, 'Ordem deve ser >= 0').default(0),
  ativa: z.boolean().default(true),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use formato hex)').optional().or(z.literal('')),
  icone: z.string().max(50, 'Ícone muito longo').optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const categoriaCreateSchema = categoriaSchema.omit({ id: true, created_at: true, updated_at: true })
export const categoriaUpdateSchema = categoriaSchema.omit({ tenant_id: true, created_at: true }).partial()

export type Categoria = z.infer<typeof categoriaSchema>
export type CategoriaCreate = z.infer<typeof categoriaCreateSchema>
export type CategoriaUpdate = z.infer<typeof categoriaUpdateSchema>