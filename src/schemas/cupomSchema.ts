import { z } from 'zod'

// ============================================
// SCHEMA BASE - CUPOM
// ============================================

export const cupomSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  codigo: z.string().min(3, 'Código deve ter ao menos 3 caracteres').max(50, 'Código muito longo').transform(v => v.toUpperCase()),
  tipo: z.enum(['percentual', 'fixo']),
  valor: z.number().positive('Valor deve ser positivo').max(100, 'Percentual máximo é 100%'),
  valor_minimo_pedido: z.number().min(0).default(0),
  uso_maximo: z.number().int().positive().optional(),
  uso_atual: z.number().int().min(0).default(0),
  validade_inicio: z.string().datetime().optional(),
  validade_fim: z.string().datetime().optional().refine(
    (val) => !val || new Date(val) > new Date(),
    { message: 'A data de validade deve ser futura' }
  ),
  aplicavel_tipos: z.array(z.enum(['balcao', 'entrega', 'mesa', 'retirada'])).optional(),
  aplicavel_categorias: z.array(z.string().uuid()).optional(),
  aplicavel_produtos: z.array(z.string().uuid()).optional(),
  descricao: z.string().max(500).optional(),
  ativo: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const cupomCreateSchema = cupomSchema.omit({ id: true, uso_atual: true, created_at: true, updated_at: true })
export const cupomUpdateSchema = cupomSchema.omit({ tenant_id: true, created_at: true }).partial()

export type Cupom = z.infer<typeof cupomSchema>
export type CupomCreate = z.infer<typeof cupomCreateSchema>
export type CupomUpdate = z.infer<typeof cupomUpdateSchema>
