import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabaseClient'

export function IconBox({ type }) {
  const common = 'w-4 h-4 stroke-current'
  switch (type) {
    case 'productos':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className={common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 8v9l9 5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 8v9l-9 5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 13v9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'stock':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className={common}>
          <path d="M3 10l9-6 9 6v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 21V13h8v8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'devoluciones':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className={common}>
          <path d="M4 4v6h6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 9a8 8 0 0 0-14-3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 15a8 8 0 0 0 14 3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'reportes':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className={common}>
          <path d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 3v6h6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'configuracion':
      return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className={common}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .37 1.99l.06.06a2.1 2.1 0 0 1-2.97 2.97l-.06-.06a1.8 1.8 0 0 0-1.99-.37 1.8 1.8 0 0 0-1.07 1.65V21a2.1 2.1 0 0 1-4.2 0v-.09A1.8 1.8 0 0 0 8.65 19.4a1.8 1.8 0 0 0-1.99.37l-.06.06a2.1 2.1 0 0 1-2.97-2.97l.06-.06A1.8 1.8 0 0 0 4.4 15a1.8 1.8 0 0 0-1.65-1.07H2.66a2.1 2.1 0 0 1 0-4.2h.09a1.8 1.8 0 0 0 4.6-3.35 1.8 1.8 0 0 0-.37-1.99l-.06-.06a2.1 2.1 0 0 1 2.97-2.97l.06.06A1.8 1.8 0 0 0 8.65 4.6a1.8 1.8 0 0 0 1.07-1.65V2.66a2.1 2.1 0 0 1 4.2 0v.09a1.8 1.8 0 0 0 1.07 1.65 1.8 1.8 0 0 0 1.99-.37l.06-.06a2.1 2.1 0 0 1 2.97 2.97l-.06.06A1.8 1.8 0 0 0 19.4 8.65a1.8 1.8 0 0 0 1.65 1.07h.29a2.1 2.1 0 0 1 0 4.2h-.09a1.8 1.8 0 0 0-1.65 1.07Z" />
        </svg>
      )
    default:
      return null
  }
}

export default function Sidebar({ onNavigate, currentView, onLogout }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('sidebar_collapsed') === '1'
  })

  const [user, setUser] = useState(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
        }
      } catch (err) {
        console.warn('Error loading user:', err)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0')
      }
    } catch {
      // ignore persistence errors
    }
  }, [collapsed])

  const items = [
    { key: 'inventory', label: 'Productos', icon: 'productos' },
    { key: 'controlStock', label: 'Stock', icon: 'stock' }
  ]

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} bg-[#080707] border-r border-gray-300 dark:border-neutral-800 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}> 
  <div className="h-16 flex items-center justify-between px-5 border-b border-gray-400 dark:border-neutral-800">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="p-2 rounded-md hover:bg-gray-800 text-gray-200 transition-colors"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <span className="text-lg leading-none">☰</span>
        </button>
        <div className={`font-semibold text-sm text-white transition-all ${collapsed ? 'opacity-0 w-0 -ml-2' : 'opacity-100 w-auto ml-0'}`}>
          <span className="block whitespace-nowrap overflow-hidden">Trendo POS</span>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 overflow-hidden">
        <ul className="space-y-4">
          {items.map(it => {
            const active = currentView === it.key
            return (
              <li key={it.key}>
                <button
                  onClick={() => onNavigate(it.key)}
                  className={`w-full flex items-center ${collapsed ? 'gap-2' : 'gap-4'} px-6 py-4 text-sm font-medium rounded-lg border transition-colors ${collapsed ? 'justify-center mr-2 ml-0' : 'ml-1 mr-4'} ${
                    active
                      ? 'bg-[#646b70] text-white border-gray-600 shadow-sm hover:bg-gray-700 transition-colors'
                      : 'text-black bg-white hover:border-gray-800 hover:bg-gray-300 dark:text-gray-100 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 transition-colors'
                  }`}
                >
                  <span className={`flex items-center justify-center ${active ? 'text-white' : 'text-black dark:text-gray-100' }`}>
                    <IconBox type={it.icon} />
                  </span>
                  <span className={`${collapsed ? 'opacity-0 w-0 -ml-2' : 'opacity-100 w-auto ml-0'} transition-all duration-200 whitespace-nowrap overflow-hidden truncate`}>
                    {it.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout bottom area */}
      <div className="border-t border-gray-400 dark:border-neutral-800 p-3 mt-auto">
        {/* User profile section */}
        {user && (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-3 mb-3 rounded-lg bg-gray-100 dark:bg-neutral-800`}>
            <img
              src={user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            {!collapsed && (
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'}
              </span>
            )}
          </div>
        )}
        
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className={`${collapsed
            ? 'flex items-center justify-center border rounded-md w-12 h-12 ml-0 mr-2 rounded border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition'
            : 'w-full flex items-center justify-center gap-2 text-sm font-medium rounded-lg px-5 py-4 ml-1 mr-4 border rounded border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={`${collapsed ? 'opacity-0 w-0 -ml-2' : 'opacity-100 w-auto ml-2'} transition-all duration-200 whitespace-nowrap overflow-hidden`}>
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  )
}
