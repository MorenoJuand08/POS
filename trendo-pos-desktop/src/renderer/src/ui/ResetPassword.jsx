import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    // Try to read the email from session if available
    (async () => {
      try {
        if (supabase?.auth?.getSession) {
          const { data } = await supabase.auth.getSession()
          if (data?.session?.user?.email) setUserEmail(data.session.user.email)
        }
      } catch {
        // ignore
      }
    })()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!password) return setError('La contraseña es requerida')
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setLoading(true)
    try {
      // Update user password via Supabase Auth (requires session set by recovery link)
      if (!supabase?.auth || typeof supabase.auth.updateUser !== 'function') {
        throw new Error('Funcionalidad de actualización de contraseña no disponible')
      }
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setInfo('Contraseña actualizada correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.')
      // Clean the URL hash to avoid reusing tokens
      try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search) } catch {}
      setTimeout(() => onDone?.(), 1500)
    } catch (err) {
      setError(err?.message || 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="w-[560px] max-w-[92vw] bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 p-8">
        <h2 className="text-xl font-semibold text-center mb-4">Recuperar contraseña</h2>
        {userEmail && <div className="text-sm text-gray-600 mb-3">Usuario: <strong>{userEmail}</strong></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Nueva contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nueva contraseña" />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirmar contraseña</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Repite la contraseña" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!error && info && <div className="text-sm text-blue-600">{info}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60">{loading ? 'Actualizando…' : 'Cambiar contraseña'}</button>
            <button type="button" onClick={() => onDone?.()} className="px-3 py-2 rounded border">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
