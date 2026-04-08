import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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

const kitchenItem = { icon: 'restaurant', label: 'Cozinha KDS' }

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, signOut } = useAuth()
  const [isHovered, setIsHovered] = useState(false)

  // No mobile usamos a prop isOpen, no desktop usamos hover
  const expanded = isHovered || (isOpen && window.innerWidth < 768)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed left-0 top-0 h-screen bg-[#16181f] flex flex-col py-3 md:py-4 lg:py-6 z-50 border-r border-[#252830]
          transition-all duration-300 ease-in-out
          ${expanded ? 'w-64' : 'w-16 lg:w-20'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo Area */}
        <div className={`mb-6 lg:mb-10 px-4 transition-all duration-300 ${expanded ? 'items-start' : 'items-center'} flex flex-col`}>
          <div className="flex items-center gap-3">
            <div className="w-8 lg:w-10 h-8 lg:h-10 shrink-0 rounded-lg lg:rounded-xl bg-[#e8391a] flex items-center justify-center shadow-lg shadow-[#e8391a]/30">
              <span className="material-symbols-outlined text-white text-lg lg:text-xl font-bold">restaurant</span>
            </div>
            {expanded && (
              <span className="font-[Outfit] font-black text-white text-xl italic tracking-tighter animate-in fade-in slide-in-from-left-2 duration-300">
                KERO <span className="text-[#e8391a]">SISTEMA</span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full space-y-1 lg:space-y-2 px-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center h-10 lg:h-12 rounded-lg lg:rounded-xl transition-all duration-300 overflow-hidden ${
                  isActive
                    ? 'bg-[#e8391a]/10 text-[#e8391a]'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-center w-full px-2 lg:px-3 gap-3">
                  <span className={`material-symbols-outlined text-2xl transition-all duration-300 shrink-0 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(232,57,26,0.4)]' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  
                  {expanded && (
                    <span className="text-sm font-bold truncate animate-in fade-in slide-in-from-left-2 duration-300">
                      {item.label}
                    </span>
                  )}

                  {isActive && !expanded && (
                    <div className="absolute left-0 w-1 h-5 lg:h-6 bg-[#e8391a] rounded-r-full shadow-lg shadow-[#e8391a]/50" />
                  )}
                  
                  {isActive && expanded && (
                    <div className="absolute right-0 w-1 h-5 lg:h-6 bg-[#e8391a] rounded-l-full" />
                  )}
                </div>
              )}
            </NavLink>
          ))}
          
          {/* Cozinha KDS - Item especial abas nova */}
          <button
            onClick={() => {
              const tenantId = user?.id
              if (tenantId) {
                window.open(`/cozinha?tenant=${tenantId}`, '_blank')
              }
            }}
            className="group relative flex items-center h-10 lg:h-12 rounded-lg lg:rounded-xl transition-all duration-300 overflow-hidden text-gray-500 hover:text-white hover:bg-white/5 w-full"
          >
            <div className="flex items-center w-full px-2 lg:px-3 gap-3">
              <span className="material-symbols-outlined text-2xl transition-all duration-300 shrink-0 group-hover:scale-110">
                {kitchenItem.icon}
              </span>
              
              {expanded && (
                <span className="text-sm font-bold truncate animate-in fade-in slide-in-from-left-2 duration-300 flex items-center gap-2">
                  {kitchenItem.label}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#22c55e]/20 text-[#22c55e] animate-pulse">
                    <span className="w-1 h-1 rounded-full bg-[#22c55e] animate-pulse" />
                    AO VIVO
                  </span>
                </span>
              )}
              
              {!expanded && (
                <div className="absolute left-0 w-1 h-2 bg-[#22c55e] rounded-r-full animate-pulse" />
              )}
            </div>
          </button>
        </nav>

        {/* Logout Button */}
        <div className="px-2 mt-auto">
          <button
            onClick={signOut}
            className={`
              w-full h-10 lg:h-12 flex items-center transition-all duration-300 rounded-lg lg:rounded-xl
              text-red-500/40 hover:text-red-500 hover:bg-red-500/10 px-2 lg:px-3 gap-3
            `}
          >
            <span className="material-symbols-outlined text-xl lg:text-2xl shrink-0">logout</span>
            {expanded && (
              <span className="text-sm font-bold animate-in fade-in slide-in-from-left-2 duration-300">
                Sair do Sistema
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
