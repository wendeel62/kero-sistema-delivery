import { z } from 'zod'

// ============================================
// SCHEMA BASE - MOTOBOY
// ============================================

export const motoboySchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  veiculo: z.enum(['moto', 'carro', 'bicicleta', 'a_pe']).default('moto'),
  placa: z.string().regex(/^[A-Z]{3}[0-9]{4}$/, 'Placa inválida (ex: ABC1234)').optional().or(z.literal('')),
  status: z.enum(['disponivel', 'em_entrega', 'indisponivel']).default('indisponivel'),
  disponivel: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  token_acesso: z.string().optional(),
  zona_entrega: z.array(z.string()).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const motoboyCreateSchema = motoboySchema.omit({ id: true, created_at: true, updated_at: true })
export const motoboyUpdateSchema = motoboySchema.omit({ tenant_id: true, created_at: true }).partial()

export type Motoboy = z.infer<typeof motoboySchema>
export type MotoboyCreate = z.infer<typeof motoboyCreateSchema>
export type MotoboyUpdate = z.infer<typeof motoboyUpdateSchema>