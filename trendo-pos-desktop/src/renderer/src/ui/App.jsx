import { useEffect, useState } from 'react'
import Login from './Login'
import ChatWindow from './ChatWindow'
import Menu from './Menu'
import Inventory from './inventario/Inventory'
import ControlStock from './inventario/ControlStock'
import Configuracion from './configuracion/Configuracion'
// Devoluciones moved under Caja module
import DevolucionesCaja from './caja/DevolucionesCaja'
import Cash from './caja/Cash'
import Contabilidad from './contabilidad/Contabilidad'
import Payment from './caja/Payment'
import InvoiceProgress from './caja/InvoiceProgress'
import { supabase } from '@/services/supabaseClient'
import { syncAll, onConnectivityChange } from '@/services/sync'
import { fillMissingBillSizes } from '@/services/db-migration'
import ResetPassword from './ResetPassword'


export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('loading') // 'login' | 'menu' | 'inventory' | 'cash' | 'invoice-progress'
  const [authMessage, setAuthMessage] = useState('')
  const [showChatbot, setShowChatbot] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null) // Datos para InvoiceProgress
  
  // Ejecutar migración de campos size en bills históricos al inicio
  useEffect(() => {
    const runMigration = async () => {
      try {
        console.log('🚀 Ejecutando migración de datos...')
        await fillMissingBillSizes()
      } catch (error) {
        console.error('⚠️ Error en migración (ignorado):', error)
        // No bloquear la aplicación si falla la migración
      }
    }
    runMigration()
  }, [])
  
  // Apply saved dark mode preference (class strategy)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedDark = window.localStorage.getItem('pref_dark') === '1'
        document.documentElement.classList.toggle('dark', savedDark)
      }
    } catch {/* ignore */}
  }, [])

  // Apply saved font size preference globally on startup
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem('pref_font_scale')
        const scale = saved ? parseFloat(saved) : 1
        const pct = isFinite(scale) && scale > 0 ? scale * 100 : 100
        document.documentElement.style.fontSize = `${pct}%`
      }
    } catch {
      // ignore if localStorage or DOM not available
    }
  }, [])

  

  useEffect(() => {
    async function boot() {
      console.log('🚀 Boot iniciado - FORZANDO LOGIN')
      console.log('Estado actual antes de limpiar:', { user, view })
      
      // SIEMPRE limpiar sesión anterior para forzar nuevo login
      try {
        if (typeof supabase?.auth?.signOut === 'function') {
          await supabase.auth.signOut()
          console.log('✅ Sesión Supabase limpiada')
        }
      } catch (e) {
        console.warn('No se pudo cerrar sesión previa:', e)
      }
      
      // SIEMPRE limpiar sesión local Y TODAS las claves de usuario
      try {
        if (typeof window !== 'undefined') {
          // Limpiar específicamente mock_user
          window.localStorage.removeItem('mock_user')
          
          // TAMBIÉN limpiar otras posibles claves de sesión
          const keysToRemove = []
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i)
            if (key && (key.includes('user') || key.includes('session') || key.includes('auth') || key.includes('token'))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => window.localStorage.removeItem(key))
          
          console.log('✅ Sesión local limpiada (y claves relacionadas):', keysToRemove)
          console.log('localStorage después de limpiar:', Object.keys(window.localStorage))
        }
      } catch (e) {
        console.warn('No se pudo limpiar sesión local:', e)
      }

      // First: check URL for recovery / error params and handle them before session check
      try {
        if (typeof window !== 'undefined') {
          const href = window.location.href
          const url = new URL(href)
          const hash = window.location.hash || ''
          let params = new URLSearchParams()
          if (hash.startsWith('#')) params = new URLSearchParams(hash.slice(1))
          const type = params.get('type') || url.searchParams.get('type')
          const access_token = params.get('access_token') || url.searchParams.get('access_token')
          const refresh_token = params.get('refresh_token') || url.searchParams.get('refresh_token')
          const error = params.get('error') || url.searchParams.get('error')
          const error_description = params.get('error_description') || url.searchParams.get('error_description')
          if (error || error_description) {
            const msg = decodeURIComponent(error_description || error || '')
            setAuthMessage(msg || 'Error al procesar el enlace de recuperación')
            setUser(null)
            setView('login')
            try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search) } catch {}
            return
          }
          if (type === 'recovery' || access_token) {
            try {
              if (access_token && typeof supabase?.auth?.setSession === 'function') {
                await supabase.auth.setSession({ access_token, refresh_token })
              }
            } catch (e) {
              console.warn('No se pudo establecer la sesión desde el enlace de recuperación', e)
            }
            setView('reset')
            try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search) } catch {}
            return
          }
        }
      } catch (e) { /* ignore */ }
      
      // 🔓 SIEMPRE mostrar login sin verificar sesión anterior
      console.log('✅ Mostrando pantalla de login')
      console.log('Estableciendo: user=null, view=login')
      setUser(null)
      setView('login')
      console.log('✅ Boot completado - usuario debe ver Login')
      console.log('Si ves el menu en lugar de Login, hay un problema en el renderizado o el estado está siendo modificado después de boot()')
      
      // subscribe to auth changes - DESACTIVADO en modo local para forzar login
      // El listener causaba que se restauraran sesiones previas
      try {
        if (typeof supabase?.auth?.onAuthStateChange === 'function') {
          // NO activar el listener en modo local
          // supabase.auth.onAuthStateChange(...)
        }
      } catch (e) {
        console.warn('No se pudo configurar listener de autenticación:', e)
      }
    }
    boot()
  }, [])

  // REMOVIDO: useEffect que reseteaba la vista al cambiar de ventana
  // Ahora solo verificamos sesión en boot() y onAuthStateChange()

  function handleAuthenticated(u) {
    console.log('✅ Usuario autenticado:', u?.email)
    if (!supabase?.auth && typeof window !== 'undefined') {
      // Modo local: guardar usuario en localStorage
      window.localStorage.setItem('mock_user', JSON.stringify(u))
      console.log('💾 Sesión local guardada')
    }
    setUser(u)
    setView('menu')
  }

  async function handleLogout() {
    console.log('🔓 Cerrando sesión...')
    // Limpiar sesión local
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mock_user')
      console.log('🗑️ Sesión local limpiada')
    }
    // Intentar cerrar sesión en Supabase si está disponible
    try {
      if (typeof supabase?.auth?.signOut === 'function') {
        await supabase.auth.signOut()
        console.log('✅ Sesión Supabase cerrada')
      }
    } catch (e) {
      console.warn('No se pudo cerrar sesión Supabase:', e)
    }
    setUser(null)
    setView('login')
  }

  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    async function initialSync() {
      try {
        await syncAll()
      } catch {
        // ignoramos en modo silencioso; se reintentará en el intervalo
      }
    }

    initialSync()

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        syncAll()
      }
    }, 60_000) // Reducir frecuencia de sync: cada 60s en lugar de 30s

    const unsubscribe = typeof onConnectivityChange === 'function'
      ? onConnectivityChange(() => { if (navigator.onLine) syncAll() })
      : undefined

    return () => {
      window.clearInterval(intervalId)
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [user])

  if (view === 'loading') return null
  if (view === 'reset') return <ResetPassword onDone={() => setView('login')} />
  
  // ⚠️ DEBUG: Revisar por qué no entra en Login
  if (!user || view === 'login') {
    console.log('✅ Renderizando Login - user:', user, 'view:', view)
    return <Login onAuthenticated={handleAuthenticated} initialInfo={authMessage} />
  }
  
  console.log('❌ RENDERIZANDO MENU CON USER:', user?.email || user, '- VIEW:', view)
  
  return (
    <>
      {view === 'inventory' && <Inventory user={user} onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'controlStock' && <ControlStock onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'configuracion' && <Configuracion onBack={() => setView('menu')} />}
      {view === 'cash' && <Cash onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'devoluciones' && <DevolucionesCaja onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'payment' && <Payment onBack={() => setView('cash')} onLogout={handleLogout} onNavigate={(nextView, data) => {
        if (nextView === 'invoice-progress') {
          setInvoiceData(data)
          setView('invoice-progress')
        } else {
          setView(nextView)
        }
      }} />}
      {view === 'invoice-progress' && <InvoiceProgress 
        saleData={invoiceData?.saleData} 
        invoiceType={invoiceData?.invoiceType}
        onBack={() => setView('cash')} 
        onFinish={() => {
          setInvoiceData(null)
          setView('cash')
        }} 
      />}
      {view === 'contabilidad' && <Contabilidad onBack={() => setView('menu')} />}
      {view === 'menu' && (
        <Menu
          onGoInventory={() => setView('inventory')}
          onGoCash={() => setView('cash')}
          onGoContabilidad={() => setView('contabilidad')}
          onGoConfiguracion={() => setView('configuracion')}
          onLogout={handleLogout}
          user={user}
        />
      )}
      
      {/* Chatbot flotante disponible en todas las vistas */}
      {showChatbot && <ChatWindow onClose={() => setShowChatbot(false)} />}
      
      {/* Botón para abrir chatbot si no está visible */}
      {!showChatbot && user && view !== 'login' && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:shadow-xl"
          title="Abrir Asistente IA"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-.97C9.23 21.62 10.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </button>
      )}
    </>
  )
}
