/**
 * Utilidades para gestionar preferencias de accesibilidad del usuario
 * Se sincroniza con localStorage automáticamente
 */

export const PreferencesManager = {
  // Obtener todas las preferencias
  getAll: () => {
    if (typeof window === 'undefined') return {}
    return {
      darkMode: window.localStorage.getItem('pref_dark') === '1',
      highContrast: window.localStorage.getItem('pref_contrast') === '1',
      fontScale: parseFloat(window.localStorage.getItem('pref_font_scale') || '1'),
      compactMode: window.localStorage.getItem('pref_compact') === '1',
      sessionTimeout: parseInt(window.localStorage.getItem('pref_session_timeout') || '30'),
      autoLogoutEnabled: window.localStorage.getItem('pref_auto_logout') !== '0'
    }
  },

  // Obtener una preferencia específica
  get: (key, defaultValue) => {
    if (typeof window === 'undefined') return defaultValue
    const prefs = PreferencesManager.getAll()
    return prefs[key] !== undefined ? prefs[key] : defaultValue
  },

  // Formatear número según preferencias
  formatNumber: (num) => {
    const numStr = String(num).split('.')[0]
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  },

  // Formatear precio con decimales
  formatPrice: (amount) => {
    const separator = ','
    const decimals = 2
    
    const formatted = amount.toFixed(decimals)
    const [integer, decimal] = formatted.split('.')
    
    let formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${formattedInteger}${separator}${decimal}`
  },

  // Obtener padding basado en modo compacto
  getPaddingClass: () => {
    const compact = PreferencesManager.get('compactMode', false)
    return compact ? 'p-2' : 'p-4'
  }
}

/**
 * Hook para usar en componentes React
 * Permite reactividad ante cambios de preferencias
 */
export function usePreferences(keys = null) {
  const prefs = PreferencesManager.getAll()
  if (keys && Array.isArray(keys)) {
    return keys.reduce((obj, key) => {
      obj[key] = prefs[key]
      return obj
    }, {})
  }
  return prefs
}
