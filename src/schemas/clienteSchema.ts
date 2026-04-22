import { z } from 'zod'

// ============================================
// SCHEMA BASE - CLIENTE
// ============================================

export const clienteSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200, 'Nome muito longo'),
  telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/, 'Telefone inválido. Use o formato (99) 99999-9999'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  data_nascimento: z.string().datetime().optional().or(z.literal('')),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional().or(z.literal('')),
  endereco: z.object({
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().length(2).optional(),
    cep: z.string().regex(/^\d{5}-?\d{3}$/).optional(),
    referencia: z.string().optional()
  }).optional(),
  observacoes: z.string().max(1000).optional(),
  ativo: z.boolean().default(true),
  bloqueado: z.boolean().default(false),
  total_pedidos: z.number().int().min(0).default(0),
  ultima_compra: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const clienteCreateSchema = clienteSchema.omit({ id: true, total_pedidos: true, ultima_compra: true, created_at: true, updated_at: true })
export const clienteUpdateSchema = clienteSchema.omit({ tenant_id: true, created_at: true }).partial()

export type Cliente = z.infer<typeof clienteSchema>
export type ClienteCreate = z.infer<typeof clienteCreateSchema>
export type ClienteUpdate = z.infer<typeof clienteUpdateSchema>