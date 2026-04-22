import { z } from 'zod'
import { pedidoTipoSchema, pedidoPagamentoSchema } from './pedidoSchema'
import { produtoItemSchema } from './produtoSchema'

// ============================================
// SCHEMA BASE - PEDIDO MANUAL (Formulário rápido)
// ============================================

// Schema de item para pedido manual (simplificado)
export const pedidoManualItemSchema = z.object({
  produto_id: z.string().uuid('ID do produto inválido'),
  quantidade: z.number().int().positive('Quantidade deve ser um número inteiro positivo'),
  tamanho: z.string().max(50).optional(),
  observacoes: z.string().max(500).optional(),
  preco_unitario: z.number().min(0, 'Preço unitário deve ser maior ou igual a zero')
})

// Schema para criar um pedido manual (sem necessidade de cliente cadastrado)
export const pedidoManualSchema = z.object({
  // Cliente (opcional - pode criar novo ou usar existente)
  cliente_id: z.string().uuid().optional(),
  cliente_nome: z.string().min(1, 'Nome do cliente é obrigatório').max(200),
  cliente_telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/, 'Telefone inválido. Use o formato (99) 99999-9999'),
  cliente_endereco: z.object({
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().length(2).optional()
  }).optional(),

  // Mesa (opcional)
  mesa_id: z.string().uuid().optional(),

  // Tipo do pedido
  tipo: pedidoTipoSchema.default('balcao'),

  // Pagamento
  forma_pagamento: pedidoPagamentoSchema,
  troco_para: z.number().min(0, 'Troco para deve ser maior ou igual a zero').optional(),

  // Endereço de entrega (para pedidos de entrega)
  endereco_entrega: z.object({
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    referencia: z.string().optional()
  }).optional(),

  // Observações
  observacoes: z.string().max(1000).optional(),

  // Itens (obrigatório)
  itens: z.array(pedidoManualItemSchema).min(1, 'Adicione pelo menos um item ao pedido')
})

export type PedidoManual = z.infer<typeof pedidoManualSchema>
export type PedidoManualItem = z.infer<typeof pedidoManualItemSchema>