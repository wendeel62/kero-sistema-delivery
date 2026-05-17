/**
 * QueryClient Configuration
 * 
 * Configurações padrão do React Query para todo o aplicativo.
 * 
 * Diretrizes de staleTime:
 * - Dados voláteis (KPIs, pedidos): 1-5 minutos
 * - Dados semi-estáticos (produtos, cardápio): 10-30 minutos  
 * - Dados estáticos (categorias, configurações): 1-24 horas
 * 
 * Exemplo de uso:
 * ```ts
 * // KPIs - 1 minuto (dados voláteis)
 * useQuery({ queryKey: ['kpis'], queryFn: fetchKpis, staleTime: 1000 * 60 * 1 })
 * 
 * // Categorias - 24 horas (dados estáticos)
 * useQuery({ queryKey: ['categorias'], queryFn: fetchCategorias, staleTime: 1000 * 60 * 60 * 24 })
 * 
 * // Produtos - 10 minutos (dados intermediários)
 * useQuery({ queryKey: ['produtos'], queryFn: fetchProdutos, staleTime: 1000 * 60 * 10 })
 * ```
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Tempos de staleTime pré-definidos
 */
export const STALE_TIMES = {
  // Dados voláteis - atualizam frequentemente
  VOLATILE: 1000 * 60 * 1, // 1 minuto (KPIs, pedidos)
  SHORT: 1000 * 60 * 5, // 5 minutos (metas, faturamento)
  
  // Dados intermediários
  MEDIUM: 1000 * 60 * 10, // 10 minutos (produtos, estoque)
  LONG: 1000 * 60 * 30, // 30 minutos (cardápio, categorias)
  
  // Dados estáticos
  STATIC: 1000 * 60 * 60 * 1, // 1 hora (configurações)
  PERMANENT: 1000 * 60 * 60 * 24, // 24 horas (categorias, dados raramente alterados)
} as const

/**
 * Configurações padrão do QueryClient
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Tempo padrão: 5 minutos
       * Dados são considerados "frescos" por 5 minutos
       */
      staleTime: STALE_TIMES.SHORT,
      
      /**
       * Retry: 1 tentativa em caso de falha
       */
      retry: 1,
      
      /**
       * Não refetar automaticamente ao focar a janela
       * (evita requisições desnecessárias)
       */
      refetchOnWindowFocus: false,
      
      /**
       * Não refetar ao reconectar
       */
      refetchOnReconnect: false,
      
      /**
       * Não refetar ao montar o componente
       */
      refetchOnMount: false,
    },
    mutations: {
      /**
       * Retry padrão para mutations: 0
       * (mutations não devem ser re-tentadas automaticamente)
       */
      retry: 0,
    },
  },
})

/**
 * Helper para criar query keys tipadas
 */
export const queryKeys = {
  // Pedidos
  pedidos: (tenantId: string) => ['pedidos', tenantId] as const,
  pedido: (tenantId: string, id: string) => ['pedido', tenantId, id] as const,
  
  // KPIs e Dashboard
  kpis: (tenantId: string) => ['kpis', tenantId] as const,
  salesKpis: (tenantId: string) => ['sales-kpis', tenantId] as const,
  financialKpis: (tenantId: string) => ['financial-kpis', tenantId] as const,
  customerKpis: (tenantId: string) => ['customer-kpis', tenantId] as const,
  productKpis: (tenantId: string) => ['product-kpis', tenantId] as const,
  deliveryKpis: (tenantId: string) => ['delivery-kpis', tenantId] as const,
  
  // Cardápio
  categorias: (tenantId: string) => ['categorias', tenantId] as const,
  produtos: (tenantId: string) => ['produtos', tenantId] as const,
  produto: (tenantId: string, id: string) => ['produto', tenantId, id] as const,
  
  // PDV
  pdvData: (tenantId: string) => ['pdv-data', tenantId] as const,
  mesas: (tenantId: string) => ['mesas', tenantId] as const,
  
  // Clientes
  clientes: (tenantId: string) => ['clientes', tenantId] as const,
  cliente: (tenantId: string, id: string) => ['cliente', tenantId, id] as const,
  
  // Configurações
  configuracoes: (tenantId: string) => ['configuracoes', tenantId] as const,
  configuracoesLoja: (tenantId: string) => ['configuracoes-loja', tenantId] as const,
  
  // Metas
  metas: (tenantId: string) => ['metas', tenantId] as const,
  
  // WhatsApp
  whatsappConversas: (tenantId: string) => ['whatsapp-conversas', tenantId] as const,
  whatsappMensagens: (tenantId: string, contatoId: string) => ['whatsapp-mensagens', tenantId, contatoId] as const,
  
  // Entregas/Motoboys
  motoboys: (tenantId: string) => ['motoboys', tenantId] as const,
  entregas: (tenantId: string) => ['entregas', tenantId] as const,
  
  // Estoque
  estoque: (tenantId: string) => ['estoque', tenantId] as const,
  produtosEstoque: (tenantId: string) => ['produtos-estoque', tenantId] as const,
} as const

export default queryClient
