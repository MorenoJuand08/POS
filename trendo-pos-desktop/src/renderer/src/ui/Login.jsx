import { useEffect, useMemo, useState } from 'react'
import { onConnectivityChange } from '@/services/sync'
import { loginWithEmail, registerWithEmail, VALID_ROLES, sendPasswordRecovery, resetPasswordWithToken } from '@/services/authLogin'
import { syncSingleAuthUserToEmployee } from '@/services/employees'

function WifiIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12" y2="20" />
    </svg>
  )
}

function CloudIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.964V10a6 6 0 0 0-11.473-2.002A4.5 4.5 0 0 0 6.5 19h11z" />
    </svg>
  )
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  useEffect(() => onConnectivityChange(() => setOnline(navigator.onLine)), [])
  return online
}

function useNowString() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const label = useMemo(() => {
    const s = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(now)
    return s.replace('.', '')
  }, [now])
  return label
}

function ConnectionBar() {
  const online = useOnline()
  const dateLabel = useNowString()
  return (
    <div className="mx-auto mt-4 w-[560px] max-w-[92vw] rounded-xl border bg-[#f8fafc] text-gray-800 shadow-md flex items-center justify-between px-5 py-3 dark:bg-neutral-800 dark:text-gray-200 dark:border-neutral-700">
      <div className="flex items-center gap-3">
        <WifiIcon className={online ? 'w-4 h-4 text-green-600 dark:text-green-300' : 'w-4 h-4 text-red-600 dark:text-red-400'} />
        <CloudIcon className={online ? 'w-4 h-4 text-green-600 dark:text-green-300' : 'w-4 h-4 text-red-600 dark:text-red-400'} />
        <span className={online ? 'font-medium text-green-700 dark:text-green-300' : 'font-medium text-red-600 dark:text-red-400'}>
          {online ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{dateLabel}</div>
    </div>
  )
}

export default function Login({ onAuthenticated, initialInfo = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // or 'register', 'recover', 'recover-confirm'
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('Cajero')
  const [firstName, setFirstName] = useState('')
  const [secondName, setSecondName] = useState('')
  const [lastName, setLastName] = useState('')
  const [secondLastName, setSecondLastName] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [phone, setPhone] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

  const isRegister = mode === 'register'
  const isRecover = mode === 'recover'
  const isRecoverConfirm = mode === 'recover-confirm'

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setInfo('')
    setPassword('')
    setConfirmPassword('')
    setFirstName('')
    setSecondName('')
    setLastName('')
    setSecondLastName('')
    setDocumentId('')
    setPhone('')
    setRole('Cajero')
  }

  // If parent provides initial info (e.g., recovery link error), show it on mount
  useEffect(() => {
    if (initialInfo) setInfo(initialInfo)
  }, [initialInfo])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'recover') {
        // Enviar correo de recuperación
        const res = await sendPasswordRecovery(email)
        if (res.isLocal && res.token) {
          // Modo local: mostrar el token y cambiar a modo de confirmación
          setRecoveryToken(res.token)
          setRecoveryEmail(email)
          setInfo(`Token de recuperación: ${res.token}\n\nCopia este token, ingresa tu correo y nueva contraseña en la siguiente pantalla.`)
          switchMode('recover-confirm')
          return
        }
        setInfo(res?.message || 'Correo enviado. Revisa tu bandeja.')
        // Volver a login después de notificar
        switchMode('login')
        return
      }

      if (mode === 'recover-confirm') {
        // Cambiar contraseña con token
        if (!email) throw new Error('Correo requerido')
        if (!recoveryToken) throw new Error('Token requerido')
        if (!newPassword) throw new Error('Nueva contraseña requerida')
        if (newPassword !== newPasswordConfirm) throw new Error('Las contraseñas no coinciden')
        if (newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
        
        const res = await resetPasswordWithToken(email, recoveryToken, newPassword)
        setInfo(res?.message || 'Contraseña actualizada. Ahora puedes iniciar sesión.')
        setTimeout(() => switchMode('login'), 1500)
        return
      }

      if (isRegister && password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }
      const result = isRegister
        ? await registerWithEmail(email, password, role, {
            firstName,
            secondName,
            lastName,
            secondLastName,
            document: documentId,
            phone
          })
        : await loginWithEmail(email, password)
      
      if (isRegister && result?.requiresLogin) {
        setInfo(result.message || 'Registro exitoso. Revisa tu correo para confirmar la cuenta.')
        switchMode('login')
        return
      }

      // 🔄 Sincronizar usuario a tabla employee SOLO si es registro en línea (no local)
      // En modo local, NO esperar la sincronización (hacerla en background sin bloquear)
      if (isRegister && result && !result.isLocal) {
        try {
          console.log('🔄 Sincronizando usuario a tabla trendo.employee...')
          // NO ESPERAR - hacer en background
          syncSingleAuthUserToEmployee().catch(syncError => {
            console.warn('⚠️ Advertencia: No se pudo sincronizar a tabla employee:', syncError.message)
          })
          console.log('✅ Sincronización iniciada en background')
        } catch (syncError) {
          console.warn('⚠️ Error al iniciar sincronización:', syncError.message)
          // No fallar el login si falla la sincronización
        }
      }

      onAuthenticated?.(result)
    } catch (err) {
      setError(err?.message || 'Error al autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Card */}
      <div className="w-[560px] max-w-[92vw] bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-12 bg-black rounded-full flex items-center justify-center text-white text-lg font-semibold">
            Trendo
          </div>
        </div>
        <h2 className="text-xl font-semibold text-center mb-6">
          {isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}
        </h2>

        {mode !== 'recover' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="cajero@tienda.com"
            />
          </div>
          {isRegister && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Primer nombre</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Segundo nombre</label>
                <input
                  type="text"
                  value={secondName}
                  onChange={(e) => setSecondName(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Carlos"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Primer apellido</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Pérez"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Segundo apellido</label>
                <input
                  type="text"
                  value={secondLastName}
                  onChange={(e) => setSecondLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="García"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>
          {isRegister && (
            <>
            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Repite tu contraseña"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Documento de identidad</label>
                <input
                  type="text"
                  required
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="1020304050"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Número celular</label>
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="3001234567"
                />
              </div>
            </div>
            <div>
              <span className="block text-sm font-medium mb-2">Selecciona el tipo de empleado</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VALID_ROLES.map((option) => {
                  const selected = role === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 dark:border-neutral-600 dark:bg-neutral-700 dark:text-gray-200'}`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
            </>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
          {!error && info && <div className="text-sm text-blue-600 dark:text-blue-300 whitespace-pre-wrap">{info}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? (isRegister ? 'Creando cuenta…' : 'Iniciando…') : (isRegister ? 'Crear cuenta' : 'Iniciar sesión')}
          </button>
        </form>
        )}

        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          Acceso exclusivo para personal autorizado ·{' '}
          {isRegister ? (
            <button className="text-blue-600 hover:underline" onClick={() => switchMode('login')}>Ya tengo cuenta</button>
          ) : (
            <>
              <button className="text-blue-600 hover:underline mr-3" onClick={() => switchMode('register')}>Crear cuenta</button>
              <button className="text-blue-600 hover:underline" onClick={() => switchMode('recover')}>Recuperar contraseña</button>
            </>
          )}
        </div>

        {/* Recuperación: si está en modo recover mostramos un pequeño form alterno */}
        {mode === 'recover' && (
          <div className="mt-4 w-full max-w-[92vw]">
            <h3 className="text-lg font-semibold mb-2">Recuperar contraseña</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Introduce tu correo para recibir un token de recuperación.</div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="tu@correo.com"
                />
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">{error}</div>}
              {!error && info && <div className="text-sm text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 whitespace-pre-line">{info}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-3 py-2 rounded bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Enviando…' : 'Enviar Token'}
              </button>
            </form>

            <div className="mt-4">
              <button
                className="text-blue-600 hover:underline text-sm"
                onClick={() => switchMode('login')}
              >
                ← Volver a login
              </button>
            </div>
          </div>
        )}

        {mode === 'recover-confirm' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm text-blue-700 dark:text-blue-300">
              <strong>Recuperación de Contraseña</strong><br/>
              <span className="text-xs">Ingresa tu correo, el token recibido y tu nueva contraseña.</span>
            </div>

            <div>
              <label className="block text-sm mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Token de Recuperación</label>
              <input
                type="text"
                required
                value={recoveryToken}
                onChange={(e) => setRecoveryToken(e.target.value)}
                className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400 font-mono text-xs"
                placeholder="Pega el token aquí"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                required
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Repite la contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Cambiando…' : 'Cambiar Contraseña'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-2 rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Volver
            </button>
          </form>
        )}
      </div>

      {/* Connection */}
      <ConnectionBar />
    </div>
  )
}
