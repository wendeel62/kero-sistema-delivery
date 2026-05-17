import { memo } from 'react'
import type { RelatorioFinanceiro } from './types'

export interface RelatoriosFinanceirosProps {
  relatorio: RelatorioFinanceiro | null
  loading: boolean
  onPeriodChange?: (inicio: string, fim: string) => void
}

export const RelatoriosFinanceiros = memo(function RelatoriosFinanceiros({
  relatorio,
  loading,
  onPeriodChange
}: RelatoriosFinanceirosProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!relatorio) {
    return (
      <div className="text-center py-20 text-on-surface-variant">
        <span className="material-symbols-outlined text-6xl mb-4 block opacity-20">analytics</span>
        <p>Nenhum relatório disponível</p>
      </div>
    )
  }

  const { receitas, despesas, saldo, previsao } = relatorio

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 border border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-primary">trending_up</span>
            <span className="text-2xl font-bold text-primary">
              R$ {receitas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
            Receitas
          </span>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl p-6 border border-red-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-red-500">trending_down</span>
            <span className="text-2xl font-bold text-red-500">
              R$ {despesas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
            Despesas
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-emerald-400">account_balance_wallet</span>
            <span className="text-2xl font-bold text-emerald-400">
              R$ {saldo.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
            Saldo Atual
          </span>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-blue-400">prediction</span>
            <span className="text-2xl font-bold text-blue-400">
              R$ {previsao.saldo_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
            Saldo Previsto
          </span>
        </div>
      </div>

      {/* Gráficos placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container rounded-[2.5rem] p-8 border border-outline min-h-[300px] flex flex-col items-center justify-center text-center shadow-lg">
          <span className="material-symbols-outlined text-5xl opacity-10 mb-4 text-primary">analytics</span>
          <p className="text-on-surface-variant italic text-sm">Gráfico de Faturamento Diário</p>
        </div>
        <div className="bg-surface-container rounded-[2.5rem] p-8 border border-outline min-h-[300px] flex flex-col items-center justify-center text-center shadow-lg">
          <span className="material-symbols-outlined text-5xl opacity-10 mb-4 text-[#ff9800]">pie_chart</span>
          <p className="text-on-surface-variant italic text-sm">Distribuição por Forma de Pagamento</p>
        </div>
      </div>

      {/* Previsões */}
      <div className="bg-surface-container rounded-3xl p-6 border border-outline">
        <h3 className="text-lg font-bold text-on-background mb-4">Previsão do Período</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-on-surface-variant mb-1">A Receber</p>
            <p className="text-xl font-bold text-emerald-400">
              R$ {previsao.receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-on-surface-variant mb-1">A Pagar</p>
            <p className="text-xl font-bold text-red-500">
              R$ {previsao.pagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-on-surface-variant mb-1">Saldo Previsto</p>
            <p className="text-xl font-bold text-on-background">
              R$ {previsao.saldo_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})
