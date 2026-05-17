import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { RelatorioFinanceiro, FluxoCaixaItem } from './types'

export interface UseRelatoriosReturn {
  relatorio: RelatorioFinanceiro | null
  fluxoCaixa: FluxoCaixaItem[]
  loading: boolean
  periodo: {
    inicio: string
    fim: string
  }
  setPeriodo: (inicio: string, fim: string) => void
  refresh: () => Promise<void>
  gerarRelatorio: (periodo: { inicio: string; fim: string }) => Promise<RelatorioFinanceiro>
  gerarFluxoCaixa: (dias?: number) => Promise<FluxoCaixaItem[]>
}

export function useRelatorios(tenantId: string | undefined): UseRelatoriosReturn {
  const [relatorio, setRelatorio] = useState<RelatorioFinanceiro | null>(null)
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoCaixaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [periodo, setPeriodo] = useState({
    inicio: new Date().toISOString().split('T')[0].slice(0, -3) + '-01',
    fim: new Date().toISOString().split('T')[0]
  })

  const gerarRelatorio = useCallback(async (periodoInfo: { inicio: string; fim: string }) => {
    if (!tenantId) return null as any

    const { inicio, fim } = periodoInfo

    // Receitas
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('total, forma_pagamento, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'entregue')
      .gte('created_at', inicio)
      .lte('created_at', fim)

    const { data: pedidosOnline } = await supabase
      .from('pedidos_online')
      .select('total, forma_pagamento, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'entregue')
      .gte('created_at', inicio)
      .lte('created_at', fim)

    const todasReceitas = [...(pedidos || []), ...(pedidosOnline || [])]
    const totalReceitas = todasReceitas.reduce((acc, p) => acc + Number(p.total), 0)

    // Despesas
    const { data: despesas } = await supabase
      .from('contas_pagar')
      .select('valor, categoria, data_vencimento')
      .eq('tenant_id', tenantId)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)

    const totalDespesas = (despesas || []).reduce((acc, d) => acc + Number(d.valor), 0)

    // Previsões
    const { data: contasReceber } = await supabase
      .from('contas_receber')
      .select('valor, data_vencimento')
      .eq('tenant_id', tenantId)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .eq('status', 'pendente')

    const { data: contasPagar } = await supabase
      .from('contas_pagar')
      .select('valor, data_vencimento')
      .eq('tenant_id', tenantId)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .eq('status', 'pendente')

    const totalReceber = (contasReceber || []).reduce((acc, c) => acc + Number(c.valor), 0)
    const totalPagar = (contasPagar || []).reduce((acc, c) => acc + Number(c.valor), 0)

    // Por categoria
    const receitasPorCategoria = todasReceitas.reduce((acc, r) => {
      const cat = r.forma_pagamento || 'outros'
      acc[cat] = (acc[cat] || 0) + Number(r.total)
      return acc
    }, {} as Record<string, number>)

    const despesasPorCategoria = (despesas || []).reduce((acc, d) => {
      const cat = d.categoria || 'outros'
      acc[cat] = (acc[cat] || 0) + Number(d.valor)
      return acc
    }, {} as Record<string, number>)

    // Por forma de pagamento
    const receitasPorForma = todasReceitas.reduce((acc, r) => {
      const forma = r.forma_pagamento || 'outros'
      acc[forma] = (acc[forma] || 0) + Number(r.total)
      return acc
    }, {} as Record<string, number>)

    const relatorioData: RelatorioFinanceiro = {
      periodo: { inicio, fim },
      receitas: {
        total: totalReceitas,
        por_categoria: receitasPorCategoria,
        por_forma_pagamento: receitasPorForma
      },
      despesas: {
        total: totalDespesas,
        por_categoria: despesasPorCategoria
      },
      saldo: {
        anterior: 0,
        atual: totalReceitas - totalDespesas,
        variacao: 0
      },
      previsao: {
        receber: totalReceber,
        pagar: totalPagar,
        saldo_previsto: totalReceber - totalPagar
      }
    }

    setRelatorio(relatorioData)
    return relatorioData
  }, [tenantId])

  const gerarFluxoCaixa = useCallback(async (dias = 30) => {
    if (!tenantId) return []

    const hoje = new Date()
    const dataFim = new Date(hoje)
    dataFim.setDate(dataFim.getDate() + dias)

    // Entradas previstas
    const { data: entradas } = await supabase
      .from('contas_receber')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('data_vencimento', hoje.toISOString())
      .lte('data_vencimento', dataFim.toISOString())

    // Saídas previstas
    const { data: saidas } = await supabase
      .from('contas_pagar')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('data_vencimento', hoje.toISOString())
      .lte('data_vencimento', dataFim.toISOString())

    const fluxo: FluxoCaixaItem[] = []

    ;(entradas || []).forEach(e => {
      fluxo.push({
        data: e.data_vencimento,
        descricao: e.descricao,
        valor: Number(e.valor),
        tipo: 'entrada',
        categoria: e.categoria,
        status: e.status === 'pago' ? 'realizado' : 'previsto'
      })
    })

    ;(saidas || []).forEach(s => {
      fluxo.push({
        data: s.data_vencimento,
        descricao: s.descricao,
        valor: Number(s.valor),
        tipo: 'saida',
        categoria: s.categoria,
        status: s.status === 'pago' ? 'realizado' : 'previsto'
      })
    })

    fluxo.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    setFluxoCaixa(fluxo)
    return fluxo
  }, [tenantId])

  const refresh = async () => {
    await gerarRelatorio(periodo)
    await gerarFluxoCaixa()
  }

  useEffect(() => {
    refresh()
  }, [periodo])

  return {
    relatorio,
    fluxoCaixa,
    loading,
    periodo,
    setPeriodo: (inicio, fim) => setPeriodo({ inicio, fim }),
    refresh,
    gerarRelatorio,
    gerarFluxoCaixa
  }
}
