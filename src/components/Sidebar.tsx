import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { path: '/', icon: 'dashboard', label: 'Dashboard' },
  { path: '/pedidos', icon: 'shopping_cart', label: 'Pedidos' },
  { path: '/pdv', icon: 'point_of_sale', label: 'PDV' },
  { path: '/cardapio-admin', icon: 'restaurant_menu', label: 'Cardápio' },
  { path: '/clientes', icon: 'group', label: 'Clientes' },
  { path: '/estoque', icon: 'inventory_2', label: 'Estoque' },
  { path: '/financeiro', icon: 'payments', label: 'Financeiro' },
  { path: '/entregas', icon: 'local_shipping', label: 'Entrega' },
  { path: '/whatsapp', icon: 'chat', label: 'WhatsApp' },
  { path: '/configuracoes', icon: 'settings', label: 'Configurações' },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut } = useAuth()

  const renderIcon = (item: typeof navItems[0], isActive: boolean) => {
    return (
      <span className={`material-symbols-outlined text-2xl transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,86,55,0.4)]' : 'group-hover:scale-110'}`}>
        {item.icon}
      </span>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed left-0 top-0 h-screen bg-background flex flex-col items-center py-3 md:py-4 lg:py-6 z-50 border-r border-outline-variant/10
        transition-transform duration-300 ease-in-out
        w-16 lg:w-20
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-6 lg:mb-10">
          <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-white text-lg lg:text-xl font-bold">restaurant</span>
          </div>
        </div>

        <nav className="flex-1 w-full space-y-2 lg:space-y-4 px-1 lg:px-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center justify-center w-10 lg:w-12 h-10 lg:h-12 mx-auto rounded-lg lg:rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-primary-container/10 text-primary shadow-[inset_0_0_12px_rgba(255,86,55,0.1)]'
                    : 'text-on-surface/40 hover:text-primary hover:bg-surface-container-high/20'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {renderIcon(item, isActive)}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-5 lg:h-6 bg-primary rounded-r-full shadow-lg shadow-primary/50" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="py-2 lg:py-4 mt-auto">
          <button
            onClick={signOut}
            className="w-10 lg:w-12 h-10 lg:h-12 flex items-center justify-center text-error/40 hover:text-error hover:bg-error-container/10 rounded-lg lg:rounded-xl transition-all"
            title="Sair"
          >
            <span className="material-symbols-outlined text-xl lg:text-2xl">logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
