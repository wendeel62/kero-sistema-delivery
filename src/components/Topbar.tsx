import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMetaPeriodo } from '../contexts/MetaPeriodoContext'
import { useMetasFaturamento } from '../hooks/useMetasFaturamento'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Topbar() {
  const { user } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const location = useLocation()
  const { periodo } = useMetaPeriodo()
  const isFinanceiro = location.pathname === '/financeiro'
  const { data: metasData } = useMetasFaturamento(user?.id ?? '', isFinanceiro)
  const currentMeta = isFinanceiro ? metasData?.[periodo] : undefined
  const progressLabel = currentMeta
    ? `${periodo.charAt(0).toUpperCase() + periodo.slice(1)}: R$ ${formatCurrency(currentMeta.realizado)} de R$ ${currentMeta.meta != null ? formatCurrency(currentMeta.meta) : '0,00'} (${currentMeta.percentual}%)`
    : ''

  return (
    <header className="relative fixed top-0 right-0 w-[calc(100%-16rem)] h-16 flex justify-between items-center px-8 z-40 bg-background/60 backdrop-blur-md border-b border-outline-variant/5">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline opacity-50 text-lg">search</span>
          <input
            className="w-full bg-surface-container-lowest border-none rounded-lg pl-10 pr-4 py-2 text-xs font-[Outfit] tracking-widest focus:ring-1 focus:ring-primary uppercase text-on-surface placeholder:text-on-surface-variant/40"
            placeholder="BUSCAR PEDIDOS OU CLIENTES..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button className="relative text-on-surface hover:opacity-80 transition-all p-1 rounded-lg hover:bg-surface-container-high/50">
            <span className="material-symbols-outlined text-lg">notifications</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-on-primary rounded-full animate-pulse" />
            </span>
          </button>
          <button className="text-on-surface hover:opacity-80 transition-all p-1 rounded-lg hover:bg-surface-container-high/50 relative group">
            <span className="material-symbols-outlined text-lg">account_circle</span>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-surface" />
            <span className="hidden absolute right-0 top-full mt-2 bg-surface-container-high border border-outline-variant rounded-lg py-2 px-4 shadow-2xl group-hover:block z-50 whitespace-nowrap text-sm">Perfil</span>
          </button>
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl glass-hover hover:rotate-12 transition-all duration-300 hover:scale-110 group relative"
            title="Alternar tema"
            aria-label="Alternar tema claro/escuro"
          >
            <Sun className={`w-5 h-5 transition-all duration-300 ${isDark ? 'opacity-20 scale-75' : ''}`} />
            <Moon className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${isDark ? '' : 'opacity-20 scale-75'}`} />
          </button>
        </div>
        {currentMeta ? (
          <div className="hidden xl:flex flex-col items-end text-[12px] text-on-surface-variant leading-tight mr-4">
            <span className="font-bold text-on-surface-variant">{periodo.charAt(0).toUpperCase() + periodo.slice(1)}</span>
            <span>
              <span className="text-on-surface-variant">R$ {formatCurrency(currentMeta.realizado)} de R$ {currentMeta.meta != null ? formatCurrency(currentMeta.meta) : '0,00'}</span>
              <span className="ml-1 font-bold" style={{ color: currentMeta.cor }}>{`(${currentMeta.percentual}%)`}</span>
            </span>
          </div>
        ) : null}
        <div className="h-6 w-[1px] bg-outline-variant opacity-20 mx-2" />
        <span className="text-on-surface-variant text-xs truncate max-w-[180px]">{user?.email}</span>
      </div>
      {currentMeta ? (
        <div className="absolute left-0 right-0 top-full h-1 overflow-hidden" title={progressLabel}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(Math.max(currentMeta.percentual, 0), 100)}%`,
              background: `linear-gradient(90deg, ${currentMeta.cor}99 0%, ${currentMeta.cor} 100%)`,
              transition: 'width 0.8s ease',
            }}
          />
        </div>
      ) : null}
    </header>
  )
}
