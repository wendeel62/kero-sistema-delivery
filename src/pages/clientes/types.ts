// Tipos compartilhados para página de Clientes

export interface Endereco {
  cep: string
  rua: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  principal: boolean
}

export interface Cliente {
  id: string
  tenant_id: string
  nome: string
  telefone: string
  email?: string
  data_nascimento?: string
  enderecos: Endereco[]
  perfil: 'novo' | 'recorrente' | 'vip'
  total_pedidos: number
  total_gasto: number
  cashback: number
  pontos: number
  primeiro_pedido?: string
  ultimo_pedido?: string
  observacoes?: string
  created_at: string
}

export interface Cupom {
  id: string
  tenant_id: string
  codigo: string
  tipo: 'percentual' | 'fixo'
  valor: number
  usos_realizados: number
  usos_maximos?: number
  validade_fim?: string
  ativo: boolean
  created_at: string
}

export interface ClienteFilters {
  searchTerm: string
  filterPerfil: 'todos' | 'novo' | 'recorrente' | 'vip'
}

export interface ClienteStats {
  total: number
  vip: number
  recorrentes: number
  novos: number
}
