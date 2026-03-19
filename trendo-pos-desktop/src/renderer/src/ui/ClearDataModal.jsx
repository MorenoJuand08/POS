import { useState } from 'react'
import { clearAllLocalData } from '@/utils/clearAllData'

/**
 * Componente para limpiar todo el almacenamiento local
 * Muestra un modal de confirmación antes de proceder
 */
export default function ClearDataModal({ isOpen, onClose, onCleared }) {
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState('')

  async function handleClearAll() {
    setIsClearing(true)
    setError('')

    try {
      await clearAllLocalData()
      // Después de limpiar, mostrar mensaje y recargar
      setTimeout(() => {
        alert('✅ Todos los datos han sido eliminados. La aplicación se recargará ahora.')
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.error('Error al limpiar datos:', err)
      setError(`Error: ${err.message}`)
      setIsClearing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6 max-w-md mx-4">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">
          ⚠️ LIMPIAR TODO EL ALMACENAMIENTO
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
          Esta acción eliminará:
        </p>

        <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2 bg-gray-50 dark:bg-neutral-700 p-4 rounded">
          <li>🗑️ LocalStorage (preferencias, datos del usuario)</li>
          <li>🗑️ SessionStorage (sesión actual)</li>
          <li>🗑️ IndexedDB (base de datos local Dexie)</li>
          <li>📊 <strong>Toda la información guardada localmente</strong></li>
        </ul>

        <p className="text-xs text-red-600 dark:text-red-400 mb-6 font-semibold">
          ⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER. Asegúrate de haber respaldado los datos importantes.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isClearing}
            className="flex-1 px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleClearAll}
            disabled={isClearing}
            className="flex-1 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isClearing ? 'Limpiando...' : 'Sí, LIMPIAR TODO'}
          </button>
        </div>
      </div>
    </div>
  )
}
