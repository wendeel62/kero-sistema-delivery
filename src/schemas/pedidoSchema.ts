import { z } from 'zod'
import { produtoItemSchema } from './produtoSchema'

// ============================================
// SCHEMA BASE - PEDIDO
// ============================================

// Status do pedido
export const pedidoStatusSchema = z.enum([
  'aberto',
  'confirmado',
  'preparando',
  'pronto',
  'saiu_entrega',
  'entregue',
  'cancelado'
])

// Tipo de pedido
export const pedidoTipoSchema = z.enum(['balcao', 'entrega', 'mesa', 'retirada'])

// Forma de pagamento
export const pedidoPagamentoSchema = z.enum([
  'dinheiro',
  'cartao_credito',
  'cartao_debito',
  'pix',
  'vale_refeicao',
  'transferencia'
])

// Schema base do pedido
export const pedidoSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
  cliente_id: z.string().uuid().optional(),
  mesa_id: z.string().uuid().optional(),
  usuario_id: z.string().uuid().optional(),
  motoboy_id: z.string().uuid().optional(),
  numero_pedido: z.string().max(20).optional(),
  tipo: pedidoTipoSchema.default('balcao'),
  status: pedidoStatusSchema.default('aberto'),
  forma_pagamento: pedidoPagamentoSchema.optional(),
  endereco_entrega: z.object({
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().length(2).optional(),
    referencia: z.string().optional()
  }).optional(),
  troco_para: z.number().min(0).optional(),
  valor_troco: z.number().min(0).optional(),
  taxa_entrega: z.number().min(0).default(0),
  subtotal: z.number().min(0, 'Subtotal não pode ser negativo'),
  desconto: z.number().min(0).default(0),
  acrescimo: z.number().min(0).default(0),
  total: z.number().min(0, 'Total não pode ser negativo'),
  cupom_id: z.string().uuid().optional(),
  cupom_desconto: z.number().min(0).default(0),
  observacoes: z.string().max(1000).optional(),
  observacoes_interna: z.string().max(1000).optional(),
  cliente_nome: z.string().max(200).optional(),
  cliente_telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/).optional(),
  started_at: z.string().datetime().optional(),
  confirmed_at: z.string().datetime().optional(),
  preparing_at: z.string().datetime().optional(),
  ready_at: z.string().datetime().optional(),
  delivered_at: z.string().datetime().optional(),
  canceled_at: z.string().datetime().optional(),
  canceled_reason: z.string().max(500).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

// Schema para criar pedido (com itens)
export const pedidoCreateSchema = pedidoSchema
  .omit({ 
    id: true, 
    numero_pedido: true,
    started_at: true,
    confirmed_at: true,
    preparing_at: true,
    ready_at: true,
    delivered_at: true,
    canceled_at: true,
    created_at: true, 
    updated_at: true 
  })
  .extend({
    itens: z.array(produtoItemSchema).min(1, 'Adicione pelo menos um item ao pedido')
  })

// Schema para atualizar pedido
export const pedidoUpdateSchema = pedidoSchema
  .omit({ 
    tenant_id: true, 
    numero_pedido: true,
    created_at: true 
  })
  .partial()
  .extend({
    // Permite atualizar status
    status: pedidoStatusSchema.optional(),
    // Permite adicionar/atualizar motoboy
    motoboy_id: z.string().uuid().optional(),
    // Permite adicionar informações de pagamento
    forma_pagamento: pedidoPagamentoSchema.optional(),
    troco_para: z.number().min(0).optional()
  })

// Schema para atualizar status do pedido
export const pedidoStatusUpdateSchema = z.object({
  status: pedidoStatusSchema,
  canceled_reason: z.string().max(500).optional(),
  motoboy_id: z.string().uuid().optional(),
  troco_para: z.number().min(0).optional()
})

// Schema para itens do pedido (standalone)
export const pedidoItemSchema = z.object({
  id: z.string().uuid().optional(),
  pedido_id: z.string().uuid(),
  produto_id: z.string().uuid(),
  produto_nome: z.string().optional(),
  quantidade: z.number().int().positive('Quantidade deve ser um número inteiro positivo'),
  preco_unitario: z.number().min(0, 'Preço unitário não pode ser negativo'),
  preco_total: z.number().min(0),
  observacoes: z.string().max(500).optional(),
  tamanho: z.string().max(50).optional(),
  sabor1: z.string().max(100).optional(),
  sabor2: z.string().max(100).optional(),
  tipoPizza: z.enum(['inteiro', 'meio-a-meio']).optional(),
  created_at: z.string().datetime().optional()
})

export type Pedido = z.infer<typeof pedidoSchema>
export type PedidoCreate = z.infer<typeof pedidoCreateSchema>
export type PedidoUpdate = z.infer<typeof pedidoUpdateSchema>
export type PedidoStatusUpdate = z.infer<typeof pedidoStatusUpdateSchema>
export type PedidoStatus = z.infer<typeof pedidoStatusSchema>
export type PedidoTipo = z.infer<typeof pedidoTipoSchema>
export type PedidoPagamento = z.infer<typeof pedidoPagamentoSchema>
export type PedidoItem = z.infer<typeof pedidoItemSchema>