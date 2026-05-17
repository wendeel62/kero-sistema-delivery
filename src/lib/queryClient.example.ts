/**
 * Exemplos de uso dos Query Keys e Stale Times
 * 
 * Este arquivo demonstra como usar as query keys e stale times
 * configurados no queryClient.ts
 */

import { useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys, STALE_TIMES } from '../lib/queryClient'
import { supabase } from '../lib/supabase'

// ============================================
// EXEMPLOS DE USO COM STALE TIMES
// ============================================

/**
 * Exemplo 1: KPIs - Dados voláteis (1 minuto)
 * KPIs mudam frequentemente, então usamos staleTime curto
 */
export function useExampleKpis(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.kpis(tenantId),
    queryFn: async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('tenant_id', tenantId)
      return data
    },
    // Dados voláteis - atualiza a cada 1 minuto
    staleTime: STALE_TIMES.VOLATILE,
  })
}

/**
 * Exemplo 2: Categorias - Dados estáticos (24 horas)
 * Categorias raramente mudam, então cacheamos por 24h
 */
export function useCategorias(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.categorias(tenantId),
    queryFn: async () => {
      const { data } = await supabase
        .from('categorias')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
      return data
    },
    // Dados estáticos - cache de 24 horas
    staleTime: STALE_TIMES.PERMANENT,
  })
}

/**
 * Exemplo 3: Produtos - Dados intermediários (10 minutos)
 * Produtos mudam ocasionalmente (preço, estoque, disponibilidade)
 */
export function useProdutos(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.produtos(tenantId),
    queryFn: async () => {
      const { data } = await supabase
        .from('produtos')
        .select('*')
        .eq('tenant_id', tenantId)
      return data
    },
    // Dados intermediários - cache de 10 minutos
    staleTime: STALE_TIMES.MEDIUM,
  })
}

/**
 * Exemplo 4: Configurações da Loja - Dados estáticos (1 hora)
 */
export function useConfiguracoesLoja(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.configuracoesLoja(tenantId),
    queryFn: async () => {
      const { data } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()
      return data
    },
    // Dados estáticos - cache de 1 hora
    staleTime: STALE_TIMES.STATIC,
  })
}

/**
 * Exemplo 5: Pedidos - Dados voláteis (1 minuto)
 * Pedidos mudam frequentemente de status
 */
export function usePedidos(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.pedidos(tenantId),
    queryFn: async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      return data
    },
    // Dados voláteis - cache de 1 minuto
    staleTime: STALE_TIMES.VOLATILE,
  })
}

/**
 * Exemplo 6: Metas de Faturamento - Dados de médio prazo (5 minutos)
 */
export function useMetasFaturamento(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.metas(tenantId),
    queryFn: async () => {
      const { data } = await supabase
        .from('metas_faturamento')
        .select('*')
        .eq('tenant_id', tenantId)
      return data
    },
    // Dados de médio prazo - cache de 5 minutos
    staleTime: STALE_TIMES.SHORT,
  })
}

// ============================================
// GUIA RÁPIDO DE STALE TIMES
// ============================================
//
// STALE_TIMES.VOLATILE (1 minuto)
// - KPIs do dashboard
// - Pedidos em tempo real
// - Status de entrega
// - Fila de cozinha
//
// STALE_TIMES.SHORT (5 minutos)
// - Metas de faturamento
// - Estatísticas de curto prazo
// - Dados de performance
//
// STALE_TIMES.MEDIUM (10 minutos)
// - Lista de produtos
// - Estoque
// - Preços
//
// STALE_TIMES.LONG (30 minutos)
// - Cardápio completo
// - Categorias com produtos
// - Combos e promoções
//
// STALE_TIMES.STATIC (1 hora)
// - Configurações da loja
// - Dados do tenant
// - Permissões
//
// STALE_TIMES.PERMANENT (24 horas)
// - Categorias (estrutura)
// - Dados cadastrais
// - Dados raramente alterados
