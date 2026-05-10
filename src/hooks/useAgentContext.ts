import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface AgentContext {
  isFirstAccess: boolean
  hasProducts: boolean
  hasDeliveryConfig: boolean
  todayRevenue: number
  totalOrders: number
  products: Array<{ id: string; name: string; price: number; category: string; active: boolean }>
  categories: Array<{ id: string; nome: string }>
  settings?: {
    nome_loja?: string
    telefone?: string
    endereco?: string
    cidade?: string
    estado?: string
    horario_abertura?: string
    horario_fechamento?: string
    loja_aberta?: boolean
    taxa_entrega?: number
    pedido_minimo?: number
    acepta_pix?: boolean
    acepta_cartao?: boolean
    acepta_dinheiro?: boolean
  }
}

export function useAgentContext(tenantId: string | null) {
  const [context, setContext] = useState<AgentContext | null>(null)

  useEffect(() => {
    async function loadContext() {
      if (!tenantId) return

      // Buscar configurações
      const { data: settings } = await supabase
        .from('configuracoes')
        .select('nome_loja, telefone, endereco, cidade, estado, horario_abertura, horario_fechamento, loja_aberta, taxa_entrega, pedido_minimo, aceita_pix, aceita_cartao, aceita_dinheiro')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      // Buscar produtos
      const { data: products } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria, disponivel')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20)

      const products_ = (products || []).map((p: { id: string; nome: string; preco: number; categoria: string; disponivel: boolean }) => ({
        id: p.id,
        name: p.nome,
        price: Number(p.preco),
        category: p.categoria || 'Sem categoria',
        active: p.disponivel ?? true,
      }))

      // Buscar categorias
      const { data: categorias } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
        .order('ordem')

      // Buscar pedidos de hoje
      const today = new Date().toISOString().split('T')[0]
      const { data: ordersPdv } = await supabase
        .from('pedidos')
        .select('total')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)

      const { data: ordersOnline } = await supabase
        .from('pedidos_online')
        .select('total')
        .eq('tenant_id', tenantId)
        .gte('created_at', today)

      const pdvTotal = (ordersPdv || []).reduce((s: number, o: { total: number }) => s + (Number(o.total) || 0), 0)
      const onlineTotal = (ordersOnline || []).reduce((s: number, o: { total: number }) => s + (Number(o.total) || 0), 0)

      setContext({
        isFirstAccess: !settings?.telefone,
        hasProducts: products_.length > 0,
        hasDeliveryConfig: !!settings?.taxa_entrega,
        todayRevenue: pdvTotal + onlineTotal,
        totalOrders: (ordersPdv?.length || 0) + (ordersOnline?.length || 0),
        products: products_,
        categories: (categorias || []).map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })),
        settings: settings || undefined,
      })
    }

    if (tenantId) loadContext()
  }, [tenantId])

  return context
}