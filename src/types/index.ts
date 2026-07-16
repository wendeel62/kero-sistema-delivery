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
  tenant_id: string
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
// ITEM PEDIDO (for UnifiedPedido)
// --------------------
export interface PedidoItemDisplay {
  qtd: number
  nome: string
  preco?: number
  observacoes?: string
  tamanho?: string
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
  canal: 'balcao' | 'entrega' | 'mesa' | 'app' | 'telefone' | 'ifood' | 'rappi'
  forma_pagamento: string
  itens: PedidoItemDisplay[]
  endereco_entrega?: string
  updated_at?: string
  mesa_numero?: number
  taxa_entrega?: number
  desconto?: number
  troco_para?: number
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

// --------------------
// PEDIDO
// --------------------
export interface Pedido {
  id: string
  numero: number
  cliente_nome: string
  cliente_telefone?: string
  endereco_entrega?: string
  total: number
  status: string
  created_at: string
  updated_at?: string
}

// --------------------
// ENTREGA ATIVA
// --------------------
export interface EntregaAtiva {
  id: string
  motoboy_id: string | null
  status: string
  pedido_id?: string
  pedido?: {
    id: string
    numero: number
    cliente_nome: string
    cliente_telefone?: string
    endereco_entrega: string
    total?: number
  }
}

// --------------------
// MOTOBoy COM POSICAO
// --------------------
export interface MotoboyPosicao {
  id: string
  nome: string
  telefone: string
  status: string
  latitude: number | null
  longitude: number | null
  disponivel?: boolean
}

// --------------------
// FILTRO MAPA
// --------------------
export interface FiltroMapa {
  mostrarDisponiveis: boolean
  mostrarEmEntrega: boolean
  mostrarInativos: boolean
  motoboyId?: string
}

// --------------------
// CHAT - TIPOS DE MENSAGEM
// --------------------
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isError?: boolean
  isRead?: boolean
  isTyping?: boolean
}

// --------------------
// CHAT - AÇÕES DO SISTEMA
// --------------------
export type ChatActionType =
  | 'create_product'
  | 'update_price'
  | 'toggle_product'
  | 'update_store_settings'
  | 'update_delivery_settings'
  | 'update_opening_hours'
  | 'update_payment_methods'
  | 'toggle_store_open'

export interface ChatActionPayload {
  type: ChatActionType
  data: Record<string, unknown>
}

// --------------------
// CHAT - ESTADO DA CONEXÃO
// --------------------
export type ChatConnectionStatus = 'connected' | 'connecting' | 'offline' | 'reconnecting'

export interface ChatState {
  isOpen: boolean
  isTyping: boolean
  messages: ChatMessage[]
  inputValue: string
  hasGreeted: boolean
  connectionStatus: ChatConnectionStatus
  unreadCount: number
}

// ============================================
// BARREL EXPORT - Todos os tipos em um local
// ============================================
// Importe todos os tipos de: src/types/index.ts
// Ex: import { Categoria, Produto, Pedido } from '@/types'
//
// Ou imports nomeados:
// import type { Categoria } from '@/types'
// ============================================