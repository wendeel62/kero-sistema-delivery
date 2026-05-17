/**
 * @module types
 * @description Tipos compartilhados do domínio Cardápio.
 * Centralizados aqui para evitar duplicação entre hooks e componentes.
 */

/** Categoria de produto no cardápio */
export interface Categoria {
  id: string
  nome: string
  descricao: string
  ordem: number
  ativo: boolean
}

/** Produto do cardápio */
export interface Produto {
  id: string
  categoria_id: string
  nome: string
  descricao: string
  preco: number | undefined
  disponivel: boolean
  destaque: boolean
  tempo_preparo: number
  imagem_url: string
}

/** Preço por tamanho (complemento) */
export interface PrecoTamanho {
  id: string
  produto_id: string
  tamanho: string
  preco: number
}

/** Sabor disponível para associação a produtos */
export interface Sabor {
  id: string
  nome: string
  descricao: string
  disponivel: boolean
}

/** Complemento temporário (antes de persistir) */
export interface ComplementoTemp {
  id?: string
  tamanho: string
  preco: number
}
