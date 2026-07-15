import { useDashboardKpis } from '../hooks/useDashboardKpis'
import { PwaInstallPrompt } from '../components/pwa/PwaInstallPrompt'
import { QzTrayBanner } from '../components/printer/QzTrayBanner'
import DashboardHeader from '../components/Dashboard/DashboardHeader'
import KpiCards from '../components/Dashboard/KpiCards'
import ReceitaChart from '../components/Dashboard/ReceitaChart'
import PicosChart from '../components/Dashboard/PicosChart'
import FunilVendas from '../components/Dashboard/FunilVendas'
import TempoPedidos from '../components/Dashboard/TempoPedidos'

export default function DashboardPage() {
  const h = useDashboardKpis()

  if (h.isError && !h.isLoading) {
    return (
      <div className="min-h-screen py-8 px-4 lg:px-8 flex items-center justify-center">
        <div className="p-8 rounded-2xl border border-outline bg-surface-container text-center max-w-md animate-fade-in-up">
          <span className="material-symbols-outlined text-5xl text-primary mb-4">error_outline</span>
          <h2 className="text-xl font-bold text-on-background mb-2">Erro ao carregar dados</h2>
          <p className="text-on-surface-variant mb-6">Nao foi possivel carregar o dashboard. Verifique sua conexao e tente novamente.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-bright transition-smooth"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

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
      <QzTrayBanner />
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
