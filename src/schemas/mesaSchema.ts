import { z } from 'zod'

// ============================================
// SCHEMA BASE - MESA
// ============================================

export const mesaSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  numero: z.number().int().positive('Número da mesa deve ser positivo'),
  capacidade: z.number().int().min(1, 'Capacidade mínima é 1').max(20, 'Capacidade máxima é 20'),
  status: z.enum(['livre', 'ocupada', 'reservada', 'manutencao']).default('livre'),
  responsavel: z.string().max(100, 'Nome muito longo').optional(),
  pessoas: z.number().int().min(0, 'Número de pessoas não pode ser negativo').optional(),
  aberta_em: z.string().datetime().optional(),
  fechada_em: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const mesaCreateSchema = mesaSchema.omit({ id: true, aberta_em: true, created_at: true, updated_at: true })
export const mesaUpdateSchema = mesaSchema.omit({ tenant_id: true, created_at: true }).partial()

export type Mesa = z.infer<typeof mesaSchema>
export type MesaCreate = z.infer<typeof mesaCreateSchema>
export type MesaUpdate = z.infer<typeof mesaUpdateSchema>