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