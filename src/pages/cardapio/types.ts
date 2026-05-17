// Tipos compartilhados para componentes do cardápio

export interface Produto {
  id: string
  categoria_id: string
  nome: string
  descricao: string
  preco: number | undefined
  disponivel: boolean
  imagem_url: string
}

export interface Categoria {
  id: string
  nome: string
}

export interface PrecoTamanho {
  id: string
  produto_id: string
  tamanho: string
  preco: number
}

export interface Sabor {
  id: string
  nome: string
  descricao: string
  disponivel: boolean
}

export interface CartItem {
  produto: Produto
  quantidade: number
  tamanho?: string
  precoUnitario: number
  tipoPizza?: 'inteiro' | 'meio-a-meio'
  sabor1?: string
  sabor2?: string
}

export interface Config {
  taxa_entrega: number
  pedido_minimo: number
  loja_aberta: boolean
  nome_fantasia?: string
  logo_url?: string
}
