import { useEffect, useState } from 'react'
import Login from './Login'
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
import { PreferencesManager } from '@/lib/preferences'


export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('boot') // 'boot' | 'login' | 'menu' | 'inventory' | 'cash' | 'invoice-progress' | 'reset' | 'verified'
  const [authMessage, setAuthMessage] = useState('')
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

  // Guardar la última vista para restaurarla tras recarga
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user) return
    if (view === 'boot') return
    try {
      window.localStorage.setItem('pref_last_view', view)
    } catch {
      // ignore
    }
  }, [view, user])

  useEffect(() => {
    async function boot() {
        console.log('🚀 Boot iniciado')

      // First: check URL for recovery / verification / error params and handle them before session check
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
          // 1) Cualquier error en el enlace
          if (error || error_description) {
            const msg = decodeURIComponent(error_description || error || '')
            setAuthMessage(msg || 'Error al procesar el enlace de recuperación')
            setUser(null)
            setView('login')
            try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search) } catch {}
            return
          }
          // 2) Recuperación de contraseña
          if (type === 'recovery') {
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

          // 3) Confirmación de correo / verificación de usuario (signup, invite, magiclink, email_change)
          if (type === 'signup' || type === 'invite' || type === 'magiclink' || type === 'email_change') {
            try {
              if (access_token && typeof supabase?.auth?.setSession === 'function') {
                await supabase.auth.setSession({ access_token, refresh_token })
              }
            } catch (e) {
              console.warn('No se pudo establecer la sesión desde el enlace de verificación', e)
            } finally {
              // Por seguridad, no mantenemos la sesión abierta automáticamente
              try {
                if (typeof supabase?.auth?.signOut === 'function') {
                  await supabase.auth.signOut()
                }
              } catch (e) {
                console.warn('No se pudo cerrar sesión tras verificación:', e)
              }
            }

            setAuthMessage('Usuario verificado correctamente. Ahora puedes iniciar sesión con tu correo y contraseña.')
            setUser(null)
            setView('verified')
            try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search) } catch {}
            return
          }
        }
      } catch (e) { /* ignore */ }

      // Restaurar sesión existente respetando la configuración de auto-logout
      try {
        const prefs = PreferencesManager.getAll()
        const autoLogoutEnabled = prefs.autoLogoutEnabled
        const sessionTimeout = prefs.sessionTimeout || 30
        const timeoutMs = sessionTimeout * 60_000

        let lastActivity = 0
        if (typeof window !== 'undefined') {
          const rawLast = window.localStorage.getItem('pref_last_activity_at')
          if (rawLast) lastActivity = parseInt(rawLast, 10) || 0
        }

        if (autoLogoutEnabled && lastActivity > 0 && Date.now() - lastActivity > timeoutMs) {
          console.log('⏰ Sesión expirada por inactividad según preferencias')
          await handleLogout()
          return
        }

        let existingUser = null

        // Intentar restaurar sesión de Supabase (modo online)
        try {
          if (typeof supabase?.auth?.getUser === 'function') {
            const { data, error } = await supabase.auth.getUser()
            if (!error && data?.user) {
              existingUser = data.user
            }
          }
        } catch (e) {
          console.warn('No se pudo obtener usuario de Supabase en boot:', e)
        }

        // Si no hay sesión online, intentar modo local (mock_user)
        if (!existingUser && typeof window !== 'undefined') {
          try {
            const rawMock = window.localStorage.getItem('mock_user')
            if (rawMock) existingUser = JSON.parse(rawMock)
          } catch (e) {
            console.warn('No se pudo leer mock_user de localStorage:', e)
          }
        }

        if (existingUser) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('pref_last_activity_at', String(Date.now()))
          }

          // Restaurar la última vista usada por el usuario, o menú por defecto
          let initialView = 'menu'
          if (typeof window !== 'undefined') {
            try {
              const savedView = window.localStorage.getItem('pref_last_view')
              if (savedView) initialView = savedView
            } catch {
              // ignore
            }
          }

          setUser(existingUser)
          setView(initialView)
          console.log('✅ Sesión restaurada en boot con vista:', initialView)
          return
        }
      } catch (e) {
        console.warn('Error restaurando sesión en boot:', e)
      }

      // Si no hay sesión previa válida, mostrar login
      setUser(null)
      setView('login')
      console.log('✅ Mostrando pantalla de login (sin sesión previa)')
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

  // Auto-logout por inactividad en tiempo de ejecución, según preferencias
  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    const prefs = PreferencesManager.getAll()
    if (!prefs.autoLogoutEnabled) {
      window.localStorage.removeItem('pref_last_activity_at')
      return
    }

    const timeoutMs = (prefs.sessionTimeout || 30) * 60_000
    const key = 'pref_last_activity_at'

    const updateActivity = () => {
      try {
        window.localStorage.setItem(key, String(Date.now()))
      } catch {
        // ignore
      }
    }

    updateActivity()

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((evt) => window.addEventListener(evt, updateActivity))

    const intervalId = window.setInterval(() => {
      try {
        const rawLast = window.localStorage.getItem(key)
        const last = rawLast ? parseInt(rawLast, 10) || 0 : 0
        if (last && Date.now() - last > timeoutMs) {
          console.log('⏰ Cerrando sesión por inactividad (runtime)')
          handleLogout()
        }
      } catch {
        // ignore
      }
    }, 30_000)

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity))
      window.clearInterval(intervalId)
    }
  }, [user])

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

  if (view === 'verified') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 transition-colors">
        <div className="w-[460px] max-w-[92vw] bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 p-8">
          <h1 className="text-2xl font-semibold text-center mb-4">Usuario verificado correctamente</h1>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 text-center">
            Tu correo ha sido confirmado. Ahora puedes iniciar sesión con tus credenciales para entrar al sistema.
          </p>
          {authMessage && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 text-center">
              {authMessage}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setAuthMessage('')
              setView('login')
            }}
            className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Volver al login
          </button>
        </div>
      </div>
    )
  }

  if (view === 'reset') return <ResetPassword onDone={() => setView('login')} />
  
  // Pantalla de carga mientras se restaura la sesión en boot
  if (view === 'boot') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100">
        <div className="w-[320px] max-w-[90vw] bg-gray-100 dark:bg-neutral-800 rounded-xl shadow-md border border-gray-200 dark:border-neutral-700 p-6 flex flex-col items-center gap-4">
          <div className="w-16 h-8 bg-black rounded-full flex items-center justify-center text-white text-sm font-semibold">
            Trendo
          </div>
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Restaurando tu sesión...
          </p>
        </div>
      </div>
    )
  }
  
  if (!user && view === 'login') {
    return <Login onAuthenticated={handleAuthenticated} initialInfo={authMessage} />
  }
  
  console.log('✅ Renderizando menú con user:', user?.email || user, '- VIEW:', view)
  
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
    </>
  )
}
