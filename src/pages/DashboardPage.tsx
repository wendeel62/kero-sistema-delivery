import { useDashboardKpis } from '../hooks/useDashboardKpis'
import { PwaInstallPrompt } from '../components/pwa/PwaInstallPrompt'
import DashboardHeader from '../components/Dashboard/DashboardHeader'
import KpiCards from '../components/Dashboard/KpiCards'
import ReceitaChart from '../components/Dashboard/ReceitaChart'
import PicosChart from '../components/Dashboard/PicosChart'
import FunilVendas from '../components/Dashboard/FunilVendas'
import TempoPedidos from '../components/Dashboard/TempoPedidos'

export default function DashboardPage() {
  const h = useDashboardKpis()

  if (h.isLoading) {
    return (
      <div className="min-h-screen py-8 px-4 lg:px-8 space-y-8 animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="h-16 w-48 bg-surface-variant rounded-lg animate-pulse"></div>
          <div className="flex gap-3">
            <div className="h-12 w-32 bg-surface-variant rounded-lg animate-pulse"></div>
            <div className="h-12 w-40 bg-surface-variant rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border border-outline bg-surface-container animate-pulse h-36"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container animate-pulse h-64"></div>
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container animate-pulse h-64"></div>
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container col-span-1 lg:col-span-2 animate-pulse h-48"></div>
          <div className="p-6 lg:p-8 rounded-2xl border border-outline bg-surface-container animate-pulse h-64"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 lg:px-8 space-y-8 animate-fade-in-up">
      <PwaInstallPrompt />
      <DashboardHeader
        lojaAberta={h.lojaAberta}
        loadingLoja={h.loadingLoja}
        linkCardapio={h.linkCardapio}
        onToggleLoja={h.toggleLoja}
      />

      <KpiCards kpiData={h.kpiData} formatCurrency={h.formatCurrency} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReceitaChart
          receitaData={h.receitaData ?? undefined}
          receitaDias={h.receitaDias}
          showReceitaDropdown={h.showReceitaDropdown}
          formatCurrency={h.formatCurrency}
          onToggleDropdown={() => h.setShowReceitaDropdown(!h.showReceitaDropdown)}
          onSelectDias={(dias) => { h.setReceitaDias(dias); h.setShowReceitaDropdown(false) }}
        />

        <PicosChart
          pedidosPorHora={h.kpis.pedidosPorHora}
          totalPedidos={h.kpis.totalPedidos}
        />

        <FunilVendas
          kpis={h.kpis}
          funilData={h.funilData}
          funilSelecionado={h.funilSelecionado}
          showFunilDropdown={h.showFunilDropdown}
          onFunilSelecionadoChange={(id) => { h.setFunilSelecionado(id); h.setShowFunilDropdown(false) }}
          onToggleDropdown={() => h.setShowFunilDropdown(!h.showFunilDropdown)}
        />

        <TempoPedidos
          temposMedios={h.kpis.temposMedios}
          tempoEntrega={h.kpis.tempoEntrega}
        />
      </div>
    </div>
  )
}
