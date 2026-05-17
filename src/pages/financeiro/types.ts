// Tipos compartilhados para página Financeiro

export interface Lancamento {
  id: string
  tenant_id: string
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento?: string
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  categoria: string
  subcategoria?: string
  forma_pagamento?: 'dinheiro' | 'cartao' | 'pix' | 'boleto' | 'outros'
  observacoes?: string
  anexo_url?: string
  created_at: string
  updated_at: string
  // Conciliação bancária
  conciliado?: boolean
  extrato_id?: string
  // Centros de custo
  centro_custo_id?: string
  projeto_id?: string
}

export interface ContaBancaria {
  id: string
  tenant_id: string
  nome: string
  banco: string
  agencia: string
  conta: string
  tipo: 'corrente' | 'poupaca' | 'caixa'
  saldo_inicial: number
  saldo_atual: number
  ativo: boolean
}

export interface ExtratoBancario {
  id: string
  conta_id: string
  data: string
  historico: string
  valor: number
  tipo: 'credito' | 'debito'
  conciliado: boolean
  lancamento_id?: string
}

export interface FluxoCaixaItem {
  data: string
  descricao: string
  valor: number
  tipo: 'entrada' | 'saida'
  categoria: string
  status: 'realizado' | 'previsto'
}

export interface RelatorioFinanceiro {
  periodo: {
    inicio: string
    fim: string
  }
  receitas: {
    total: number
    por_categoria: Record<string, number>
    por_forma_pagamento: Record<string, number>
  }
  despesas: {
    total: number
    por_categoria: Record<string, number>
  }
  saldo: {
    anterior: number
    atual: number
    variacao: number
  }
  previsao: {
    receber: number
    pagar: number
    saldo_previsto: number
  }
}

export interface FiltroLancamentos {
  dataInicio: string
  dataFim: string
  categoria?: string
  status?: string
  formaPagamento?: string
  search?: string
}

export interface ContaPagarReceber {
  id: string
  tenant_id: string
  descricao: string
  valor: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'atrasado' | 'recebido'
  categoria: string
  tipo: 'pagar' | 'receber'
  parcelado?: boolean
  parcela_atual?: number
  total_parcelas?: number
}

export interface Caixa {
  id: string
  tenant_id: string
  status: 'aberto' | 'fechado'
  valor_abertura: number
  valor_fechamento?: number
  aberto_em: string
  fechado_em?: string
  responsavel?: string
}
