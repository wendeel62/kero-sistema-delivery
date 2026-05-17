// Tipos compartilhados para página de Estoque

export interface Ingrediente {
  id: string
  tenant_id: string
  nome: string
  unidade: 'kg' | 'un' | 'lt' | 'g' | 'ml'
  estoque_atual: number
  estoque_minimo: number
  estoque_critico: number
  custo_medio: number
  categoria: string
  fornecedor_id?: string
  last_update: string
  // Controle de lote e validade
  lote?: string
  validade?: string
  // Múltiplos depósitos
  deposito_id?: string
}

export interface Fornecedor {
  id: string
  tenant_id: string
  nome_fantasia: string
  cnpj?: string
  contato_nome?: string
  telefone?: string
  email?: string
  categoria?: string
  endereco?: string
  cidade?: string
  estado?: string
}

export interface MovimentacaoEstoque {
  id: string
  tenant_id: string
  ingrediente_id: string
  tipo: 'entrada' | 'saida' | 'ajuste' | 'perda'
  quantidade: number
  valor_unitario: number
  valor_total: number
  motivo?: string
  observacoes?: string
  created_at: string
  created_by?: string
  // Controle de lote e validade
  lote?: string
  validade?: string
  // Múltiplos depósitos
  deposito_id?: string
  deposito_origem?: string
  deposito_destino?: string
}

export interface EntradaEstoque {
  id: string
  tenant_id: string
  ingrediente_id: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  data_entrada: string
  nota_fiscal?: string
  fornecedor_id?: string
  // Controle de lote e validade
  lote?: string
  validade?: string
  // Múltiplos depósitos
  deposito_id?: string
}

export interface AjusteEstoque {
  id: string
  tenant_id: string
  ingrediente_id: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  motivo: string
  observacoes?: string
  created_at: string
  created_by: string
}

export interface Deposito {
  id: string
  tenant_id: string
  nome: string
  endereco?: string
  responsavel?: string
  telefone?: string
  ativo: boolean
}

export interface EstoqueStats {
  total: number
  critico: number
  baixo: number
  valor_total: number
  vencimentos_proximos: number
}

export interface FiltroEstoque {
  searchTerm: string
  categoria: string
  deposito?: string
  apenasBaixo?: boolean
  apenasVencimento?: boolean
}
