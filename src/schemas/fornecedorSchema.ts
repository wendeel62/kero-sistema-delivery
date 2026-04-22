import { z } from 'zod'

// ============================================
// SCHEMA BASE - FORNECEDOR
// ============================================

export const fornecedorSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  nome_fantasia: z.string().max(100, 'Nome fantasia muito longo').optional(),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido').optional().or(z.literal('')),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional().or(z.literal('')),
  telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/, 'Telefone inválido').optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.object({
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().length(2).optional(),
    cep: z.string().regex(/^\d{5}-?\d{3}$/).optional()
  }).optional(),
  observacoes: z.string().max(1000).optional(),
  ativo: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const fornecedorCreateSchema = fornecedorSchema.omit({ id: true, created_at: true, updated_at: true })
export const fornecedorUpdateSchema = fornecedorSchema.omit({ tenant_id: true, created_at: true }).partial()

export type Fornecedor = z.infer<typeof fornecedorSchema>
export type FornecedorCreate = z.infer<typeof fornecedorCreateSchema>
export type FornecedorUpdate = z.infer<typeof fornecedorUpdateSchema>