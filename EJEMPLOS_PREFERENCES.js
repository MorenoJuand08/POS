/**
 * EJEMPLOS DE USO: Cómo Usar PreferencesManager en Otros Componentes
 * 
 * Copiar y adaptar estos ejemplos en tus componentes
 */

// ============================================
// 1. EJEMPLO BÁSICO - Obtener una preferencia
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function MiComponente() {
  const darkMode = PreferencesManager.get('darkMode', false)
  
  return (
    <div className={darkMode ? 'dark bg-gray-900' : 'bg-white'}>
      <p>Dark mode: {darkMode ? 'Activado' : 'Desactivado'}</p>
    </div>
  )
}

// ============================================
// 2. EJEMPLO - Formatear Números Grandes
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function VentasHoy({ total }) {
  const formatted = PreferencesManager.formatNumber(total)
  
  return (
    <div className="p-4 border rounded">
      <h3>Total Hoy</h3>
      <p className="text-2xl font-bold">${formatted}</p>
    </div>
  )
}

// Uso:
// <VentasHoy total={1500000} />
// Output: $1.500.000 (con puntos) o $1,500,000 (con comas)

// ============================================
// 3. EJEMPLO - Formatear Precios
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function CartItem({ product, price, quantity }) {
  const total = price * quantity
  const formatted = PreferencesManager.formatPrice(total)
  
  return (
    <div className="flex justify-between">
      <span>{product}</span>
      <span>${formatted}</span>
    </div>
  )
}

// Uso:
// <CartItem product="Producto A" price={1500.50} quantity={2} />
// Output: $3.001,00 (con 2 decimales) o $3.001 (sin decimales)

// ============================================
// 4. EJEMPLO - Modo Compacto
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function InventarioLista({ productos }) {
  const compactMode = PreferencesManager.get('compactMode', false)
  const padding = PreferencesManager.getPaddingClass() // 'p-2' o 'p-4'
  
  return (
    <div className={`${padding} space-y-2`}>
      {productos.map(p => (
        <div 
          key={p.id}
          className={`border rounded ${compactMode ? 'p-2' : 'p-4'}`}
        >
          <h4>{p.nombre}</h4>
          <p>${PreferencesManager.formatPrice(p.precio)}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================
// 5. EJEMPLO - Animaciones Condicionales
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function BotonConAnimacion() {
  const animClass = PreferencesManager.getAnimationClass()
  
  return (
    <button 
      className={`${animClass} bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700`}
    >
      Guardar
    </button>
  )
}

// Si animaciones activadas: "transition-all duration-300" + hover
// Si animaciones desactivadas: "" (sin transiciones)

// ============================================
// 6. EJEMPLO - Dark Mode en Tabla
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function TablaVentas({ ventas }) {
  const darkMode = PreferencesManager.get('darkMode', false)
  
  return (
    <table className={`w-full ${darkMode ? 'dark' : ''}`}>
      <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
        <tr>
          <th className={darkMode ? 'text-white' : 'text-gray-900'}>Producto</th>
          <th className={darkMode ? 'text-white' : 'text-gray-900'}>Precio</th>
          <th className={darkMode ? 'text-white' : 'text-gray-900'}>Cantidad</th>
        </tr>
      </thead>
      <tbody>
        {ventas.map(v => (
          <tr key={v.id} className={darkMode ? 'border-gray-700' : 'border-gray-300'}>
            <td>{v.producto}</td>
            <td>${PreferencesManager.formatPrice(v.precio)}</td>
            <td>{v.cantidad}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================
// 7. EJEMPLO - Obtener TODAS las preferencias
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function DebugPreferences() {
  const prefs = PreferencesManager.getAll()
  
  return (
    <pre className="bg-gray-100 p-4 rounded overflow-auto">
      {JSON.stringify(prefs, null, 2)}
    </pre>
  )
}

// Output:
// {
//   "darkMode": true,
//   "highContrast": false,
//   "fontScale": 1.15,
//   "compactMode": false,
//   "enableAnimations": true,
//   "numberFormat": "dots",
//   "priceDecimals": 2,
//   "soundEnabled": true,
//   "sessionTimeout": 30
// }

// ============================================
// 8. EJEMPLO - Alto Contraste Adaptativo
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function Tarjeta({ titulo, valor }) {
  const highContrast = PreferencesManager.get('highContrast', false)
  
  const borderColor = highContrast ? 'border-2 border-black' : 'border border-gray-300'
  const bgColor = highContrast ? 'bg-white' : 'bg-gray-50'
  
  return (
    <div className={`${borderColor} ${bgColor} p-4 rounded`}>
      <h4 className="font-bold">{titulo}</h4>
      <p className="text-2xl">${PreferencesManager.formatPrice(valor)}</p>
    </div>
  )
}

// ============================================
// 9. EJEMPLO - Componente Inteligente
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function PanelAjustable({ datos }) {
  const prefs = PreferencesManager.getAll()
  
  return (
    <div 
      className={`
        ${prefs.darkMode ? 'dark' : ''}
        ${prefs.compactMode ? 'p-2' : 'p-4'}
        ${PreferencesManager.getAnimationClass()}
        border rounded
      `}
      style={{ fontSize: `${prefs.fontScale * 100}%` }}
    >
      {datos.map(item => (
        <div key={item.id} className="mb-2">
          <h4>{item.nombre}</h4>
          <p>${PreferencesManager.formatPrice(item.precio)}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================
// 10. EJEMPLO - Guardián de Sesión
// ============================================

import { useEffect } from 'react'
import { PreferencesManager } from '@/lib/preferences'
import { supabase } from '@/services/supabaseClient'

export function SesionGuardian() {
  useEffect(() => {
    const timeout = PreferencesManager.get('sessionTimeout', 30)
    
    let timer = null
    
    const resetTimer = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        // Cerrar sesión
        supabase.auth.signOut()
        window.location.href = '/login'
      }, timeout * 60 * 1000) // Convertir minutos a milisegundos
    }
    
    // Resetear timer en cada actividad
    window.addEventListener('mousedown', resetTimer)
    window.addEventListener('keydown', resetTimer)
    
    resetTimer()
    
    return () => {
      window.removeEventListener('mousedown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      if (timer) clearTimeout(timer)
    }
  }, [])
  
  return null // Este componente no renderiza nada
}

// Uso en App.jsx:
// <SesionGuardian />

// ============================================
// 11. EJEMPLO - Hook Personalizado
// ============================================

import { useState, useEffect } from 'react'

function useUserPreferences(keysToWatch = null) {
  const [prefs, setPrefs] = useState({})
  
  useEffect(() => {
    // Cargar preferencias iniciales
    const allPrefs = PreferencesManager.getAll()
    const toWatch = keysToWatch ? allPrefs[keysToWatch] : allPrefs
    setPrefs(toWatch)
    
    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      const updated = PreferencesManager.getAll()
      const toWatch = keysToWatch ? updated[keysToWatch] : updated
      setPrefs(toWatch)
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [keysToWatch])
  
  return prefs
}

// Uso:
// const darkMode = useUserPreferences('darkMode')
// const allPrefs = useUserPreferences()

// ============================================
// 12. EJEMPLO - Estilos Dinámicos
// ============================================

import { PreferencesManager } from '@/lib/preferences'

export function ConEstilosDinamicos() {
  const prefs = PreferencesManager.getAll()
  
  const styles = {
    fontSize: `${prefs.fontScale * 16}px`, // Base 16px
    padding: prefs.compactMode ? '8px' : '16px',
    backgroundColor: prefs.darkMode ? '#1f2937' : '#ffffff',
    color: prefs.darkMode ? '#ffffff' : '#000000',
    transition: prefs.enableAnimations ? 'all 0.3s ease' : 'none',
    borderWidth: prefs.highContrast ? '2px' : '1px'
  }
  
  return (
    <div style={styles}>
      Contenido con estilos dinámicos
    </div>
  )
}

// ============================================
// REFERENCIA RÁPIDA
// ============================================

/*
MÉTODOS DISPONIBLES:

1. PreferencesManager.getAll()
   → Retorna objeto con todas las preferencias
   
2. PreferencesManager.get(key, defaultValue)
   → Obtiene una preferencia específica
   
3. PreferencesManager.formatNumber(num)
   → Formatea número con separadores
   
4. PreferencesManager.formatPrice(amount)
   → Formatea precio con decimales
   
5. PreferencesManager.hasAnimations()
   → Verifica si animaciones están activadas
   
6. PreferencesManager.getAnimationClass()
   → Retorna clase CSS para animaciones
   
7. PreferencesManager.getPaddingClass()
   → Retorna clase de padding (compacto o normal)

PREFERENCIAS DISPONIBLES:

- darkMode (boolean)
- highContrast (boolean)
- fontScale (0.9-1.3)
- compactMode (boolean)
- enableAnimations (boolean)
- numberFormat ('dots' | 'commas' | 'none')
- priceDecimals (0-2)
- soundEnabled (boolean)
- sessionTimeout (5-120 minutos)
*/
