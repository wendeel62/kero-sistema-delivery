import { z } from 'zod'

// ============================================
// SCHEMA BASE - PRODUTO
// ============================================

export const produtoSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  categoria_id: z.string().uuid('ID da categoria inválido').optional(),
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  descricao: z.string().max(1000, 'Descrição muito longa').optional(),
  preco: z.number().min(0, 'Preço não pode ser negativo').optional(),
  preco_custo: z.number().min(0, 'Preço de custo não pode ser negativo').optional(),
  disponivel: z.boolean().default(true),
  destaque: z.boolean().default(false),
  ativo: z.boolean().default(true),
  tempo_preparo: z.number().int().min(0, 'Tempo de preparo não pode ser negativo').default(30),
  imagem_url: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  ordem: z.number().int().min(0).default(0),
  sku: z.string().max(50).optional(),
  codigo_barras: z.string().max(50).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const produtoCreateSchema = produtoSchema.omit({ id: true, created_at: true, updated_at: true })
export const produtoUpdateSchema = produtoSchema.omit({ tenant_id: true, created_at: true }).partial()

// ============================================
// FORM SCHEMA - Excludes tenant_id and auto-managed fields
// Used for form validation in admin UI
// ============================================
export const produtoFormSchema = produtoSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
  ordem: true,
  ativo: true,
  preco_custo: true,
  sku: true,
  codigo_barras: true
})

export type ProdutoForm = z.infer<typeof produtoFormSchema>

// Schema para item do pedido
export const produtoItemSchema = z.object({
  produto_id: z.string().uuid(),
  nome: z.string().optional(),
  quantidade: z.number().int().positive('Quantidade deve ser um número inteiro positivo'),
  preco_unitario: z.number().min(0, 'Preço unitário não pode ser negativo'),
  observacoes: z.string().max(500).optional(),
  tamanho: z.string().max(50).optional(),
  sabor1: z.string().max(100).optional(),
  sabor2: z.string().max(100).optional(),
  tipoPizza: z.enum(['inteiro', 'meio-a-meio']).optional()
})

export type Produto = z.infer<typeof produtoSchema>
export type ProdutoCreate = z.infer<typeof produtoCreateSchema>
export type ProdutoUpdate = z.infer<typeof produtoUpdateSchema>
export type ProdutoItem = z.infer<typeof produtoItemSchema>