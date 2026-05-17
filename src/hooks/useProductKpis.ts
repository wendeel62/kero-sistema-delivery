import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getTenantIdSafe } from '../lib/getTenantId'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// TYPES
// ============================================

export interface ProdutoVendido {
  id: string
  nome: string
  totalVendido: number
  quantidade: number
}

export interface ProductKpis {
  topProdutos: ProdutoVendido[]
}

// ============================================
// HOOK
// ============================================

export function useProductKpis() {
  const { user } = useAuth()
  const tenantId = user?.user_metadata?.tenant_id || getTenantIdSafe() || '19f48a0b-3117-4d2b-856e-41673dc43275'

  // Top Produtos
  const { data: productKpis = defaultProductKpis, isLoading } = useQuery<ProductKpis>({
    queryKey: ['product-kpis', tenantId],
    queryFn: async () => {
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: itensPedido } = await supabase
        .from('itens_pedido')
        .select('produto_id, quantidade, preco')
        .eq('tenant_id', tenantId)
        .gte('created_at', seteDiasAtras)

      const produtoIds = [
        ...new Set(
          itensPedido?.map(item => item.produto_id).filter(Boolean) || []
        )
      ]

      let produtoMap: Record<string, { nome: string; totalVendido: number; quantidade: number }> = {}

      if (produtoIds.length > 0) {
        const { data: produtos } = await supabase
          .from('produtos')
          .select('id, nome')
          .eq('tenant_id', tenantId)
          .in('id', produtoIds)

        const produtosPorId = (produtos || []).reduce(
          (acc, p) => {
            acc[p.id] = p.nome
            return acc
          },
          {} as Record<string, string>
        )

        produtoMap = produtoIds.reduce(
          (acc, id) => {
            acc[id] = { nome: produtosPorId[id] || 'Produto', totalVendido: 0, quantidade: 0 }
            return acc
          },
          {} as Record<string, { nome: string; totalVendido: number; quantidade: number }>
        )

        if (itensPedido) {
          for (const item of itensPedido) {
            if (produtoMap[item.produto_id]) {
              produtoMap[item.produto_id].totalVendido += Number(item.preco) * item.quantidade
              produtoMap[item.produto_id].quantidade += item.quantidade
            }
          }
        }
      }

      const topProdutos = Object.entries(produtoMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.totalVendido - a.totalVendido)
        .slice(0, 5) as ProdutoVendido[]

      return {
        topProdutos
      }
    },
    staleTime: 30000,
    enabled: !!tenantId
  })

  return {
    productKpis,
    isLoading
  }
}

const defaultProductKpis: ProductKpis = {
  topProdutos: []
}
