import { z } from 'zod'

export const pedidoManualSchema = z.object({
  cliente_id: z.string().optional(),
  mesa_id: z.string().optional(),
  cliente_nome: z.string().min(1, 'Nome do cliente é obrigatório'),
  cliente_telefone: z.string().regex(/^\(\d{2}\)\s9?\d{4}-\d{4}$/, 'Telefone inválido. Use o formato (99) 99999-9999'),
  tipo: z.enum(['balcao', 'entrega', 'mesa']),
  forma_pagamento: z.enum(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'vale_refeicao']),
  endereco_entrega: z.string().optional().or(z.literal('')),
  numero_endereco: z.string().optional().or(z.literal('')),
  bairro: z.string().optional().or(z.literal('')),
  troco_para: z.number().min(0, 'Troco para deve ser maior ou igual a zero').optional(),
  observacoes: z.string().optional(),
  status: z.string().default('aberto'),
  total: z.number().min(0, 'Total deve ser maior ou igual a zero'),
  itens: z.array(
    z.object({
      produto_id: z.string(),
      quantidade: z.number().int().positive('Quantidade deve ser um número inteiro positivo'),
      tamanho: z.string().optional(),
      observacoes: z.string().optional(),
      preco_unitario: z.number().min(0, 'Preço unitário deve ser maior ou igual a zero')
    })
  ).min(1, 'Adicione pelo menos um item ao pedido')
})