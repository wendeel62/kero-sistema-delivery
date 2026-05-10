import { useNavigate } from 'react-router-dom'

interface DashboardHeaderProps {
  lojaAberta: boolean
  loadingLoja: boolean
  linkCardapio: string
  onToggleLoja: () => void
}

export default function DashboardHeader({
  lojaAberta,
  loadingLoja,
  linkCardapio,
  onToggleLoja
}: DashboardHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-slide-in-down">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold font-headline text-on-background tracking-tight">Dashboard</h1>
        <p className="text-on-surface-variant mt-1 text-lg">Visão geral do dia</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onToggleLoja}
          disabled={loadingLoja}
          className={`px-6 py-3 rounded-lg font-bold border-2 transition-all flex items-center gap-2 text-sm ${
            lojaAberta
              ? 'border-secondary/50 bg-secondary/5 hover:border-secondary-bright text-secondary-bright hover:bg-secondary/10 shadow-lg shadow-secondary/20'
              : 'border-primary/50 bg-primary/5 hover:border-primary-bright text-primary hover:bg-primary/10 shadow-lg shadow-primary/20'
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${lojaAberta ? 'bg-secondary shadow-lg' : 'bg-primary'}`} />
          {lojaAberta ? 'Loja Aberta' : 'Loja Fechada'}
        </button>
        <button
          onClick={() => navigate(linkCardapio)}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary-bright hover:from-primary-bright hover:to-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-primary/50 hover:shadow-xl transition-all border border-transparent flex items-center gap-2 text-sm animate-slide-in-right"
        >
          <span className="material-symbols-outlined !text-lg">qr_code_scanner</span>
          Abrir Cardápio
        </button>
      </div>
    </div>
  )
}
