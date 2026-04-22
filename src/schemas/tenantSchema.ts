import { z } from 'zod'

// ============================================
// SCHEMA BASE - TENANT (Empresa/Loja)
// ============================================

export const tenantSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido. Use o formato 00.000.000/0000-00').optional().or(z.literal('')),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional().or(z.literal('')),
  telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/, 'Telefone inválido').optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.object({
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().length(2, 'Estado deve ter 2 letras').optional(),
    cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional()
  }).optional(),
  configuracoes: z.object({
    permite_delivery: z.boolean().default(true),
    permite_retirada: z.boolean().default(true),
    taxa_entrega: z.number().min(0).default(0),
    tempo_entrega_min: z.number().int().min(0).default(30),
    tempo_entrega_max: z.number().int().min(0).default(60),
    pedido_minimo: z.number().min(0).default(0),
    horarios_funcionamento: z.object({
      seg: z.array(z.string()).optional(),
      ter: z.array(z.string()).optional(),
      qua: z.array(z.string()).optional(),
      qui: z.array(z.string()).optional(),
      sex: z.array(z.string()).optional(),
      sab: z.array(z.string()).optional(),
      dom: z.array(z.string()).optional()
    }).optional(),
    cores: z.object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional()
    }).optional()
  }).optional(),
  ativo: z.boolean().default(true),
  plano: z.enum(['basico', 'profissional', 'premium']).default('basico'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export type Tenant = z.infer<typeof tenantSchema>
export type TenantInput = z.infer<typeof tenantSchema>