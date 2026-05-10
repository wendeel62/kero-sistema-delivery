// ============================================
// TIPOS CENTRALIZADOS DO PROJETO KERO
// Bloco 5 - Centralização de Interfaces de Domínio
// ============================================

// --------------------
// CATEGORIA
// --------------------
export interface Categoria {
  id: string
  nome: string
  descricao?: string
  ordem?: number
  ativo?: boolean
}

// --------------------
// PRODUTO
// --------------------
export interface Produto {
  id: string
  categoria_id: string
  nome: string
  descricao?: string
  preco?: number
  disponivel: boolean
  destaque?: boolean
  tempo_preparo?: number
  imagem_url?: string
  ordem?: number
}

// --------------------
// PRECO TAMANHO
// --------------------
export interface PrecoTamanho {
  id: string
  produto_id: string
  tamanho: string
  preco: number
}

// --------------------
// SABOR
// --------------------
export interface Sabor {
  id: string
  nome: string
  descricao?: string
  disponivel: boolean
}

// --------------------
// MESA
// --------------------
export interface Mesa {
  id: string
  numero: number
  capacidade: number
  status: string
  responsavel?: string
  pessoas?: number
  aberta_em?: string
}

// --------------------
// ITEM PEDIDO
// --------------------
export interface ItemPedido {
  produto: Produto
  quantidade: number
  observacoes?: string
  tamanho?: string
  sabor1?: string
  sabor2?: string
  tipoPizza?: 'inteiro' | 'meio-a-meio'
}

// --------------------
// MOTOBOY
// --------------------
export interface Motoboy {
  id: string
  nome: string
  telefone: string
  status: string
  disponivel?: boolean
  latitude?: number | null
  longitude?: number | null
  token_acesso?: string
}

// --------------------
// INGREDIENTE
// --------------------
export interface Ingrediente {
  id: string
  nome: string
  descricao?: string
  unidade: string
  estoque_minimo?: number
  estoque_atual?: number
  custo_medio?: number
  last_update?: string
}

// --------------------
// FORNECEDOR
// --------------------
export interface Fornecedor {
  id: string
  nome: string
  nome_fantasia?: string
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: string
}

// --------------------
// CONFIGURACOES
// --------------------
export interface Configuracoes {
  id: string
  tenant_id: string
  nome_loja: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  logo_url?: string
  impressao_automatica?: boolean
  largura_papel?: 58 | 80
}

// --------------------
// UNIFIED PEDIDO
// --------------------
export interface UnifiedPedido {
  id: string
  numero: number
  cliente_nome: string
  cliente_telefone: string
  total: number
  tipo_tabela: 'pedidos' | 'pedidos_online'
  raw_status: string
  status_kanban: 'novo' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado'
  created_at: string
  canal: 'balcao' | 'entrega' | 'mesa' | 'app' | 'telefone' | 'ifood' | 'rappi' | 'whatsapp'
  forma_pagamento: string
  itens: any[]
  endereco_entrega?: string
  updated_at?: string
  mesa_numero?: number
}

// --------------------
// TRACKING CONFIG
// --------------------
export interface TrackingConfig {
  meta_pixel_id?: string
  ga4_measurement_id?: string
  utmfy_token?: string
}

export type TrackingEvent =
  | { event: 'PageView' }
  | { event: 'ViewContent'; produto_nome: string; preco?: number; categoria?: string }
  | { event: 'AddToCart'; produto_nome: string; preco?: number; quantidade: number }
  | { event: 'InitiateCheckout'; valor_total: number; quantidade_itens: number }
  | { event: 'Purchase'; valor_total: number; pedido_numero: number; forma_pagamento: string }