import { useAuth } from '../contexts/AuthContext'

export default function Topbar() {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 flex justify-between items-center px-8 z-40 bg-background/60 backdrop-blur-md border-b border-outline-variant/5">
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
          <button className="relative text-on-surface hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full" />
          </button>
          <button className="text-on-surface hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
        <div className="h-6 w-[1px] bg-outline-variant opacity-20 mx-2" />
        <span className="text-on-surface-variant text-xs truncate max-w-[180px]">{user?.email}</span>
      </div>
    </header>
  )
}
