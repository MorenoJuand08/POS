/**
 * Script para limpiar todo el almacenamiento local
 * Elimina: localStorage, sessionStorage, IndexedDB (Dexie)
 */

export async function clearAllLocalData() {
  try {
    console.log('🧹 Iniciando limpieza completa de datos locales...')

    // 1. Limpiar localStorage
    console.log('📦 Limpiando localStorage...')
    localStorage.clear()
    console.log('✓ localStorage limpiado')

    // 2. Limpiar sessionStorage
    console.log('📦 Limpiando sessionStorage...')
    sessionStorage.clear()
    console.log('✓ sessionStorage limpiado')

    // 3. Limpiar IndexedDB (Dexie)
    console.log('📦 Limpiando IndexedDB...')
    const dbNames = await indexedDB.databases()
    for (const db of dbNames) {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(db.name)
        request.onsuccess = () => {
          console.log(`✓ Base de datos "${db.name}" eliminada`)
          resolve()
        }
        request.onerror = () => {
          console.warn(`⚠️ Error eliminando "${db.name}":`, request.error)
          reject(request.error)
        }
      })
    }

    console.log('✅ LIMPIEZA COMPLETA FINALIZADA')
    console.log('📝 Todos los datos locales han sido eliminados')
    console.log('🔄 Por favor, recarga la aplicación (F5)')

    return true
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    throw error
  }
}

/**
 * Comando para ejecutar en consola del navegador (DevTools)
 * 
 * PASOS:
 * 1. Abre DevTools (F12)
 * 2. Ve a la pestaña "Console"
 * 3. Copia y pega el siguiente código:
 * 
 * localStorage.clear();
 * sessionStorage.clear();
 * indexedDB.databases().then(dbs => {
 *   Promise.all(dbs.map(db => new Promise(r => indexedDB.deleteDatabase(db.name).onsuccess = r)))
 *     .then(() => {
 *       console.log('✅ LIMPIEZA COMPLETA');
 *       location.reload();
 *     });
 * });
 */
export const CONSOLE_COMMAND = `
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => {
  Promise.all(dbs.map(db => new Promise(r => indexedDB.deleteDatabase(db.name).onsuccess = r)))
    .then(() => {
      console.log('✅ LIMPIEZA COMPLETA - La aplicación se recargará...');
      location.reload();
    });
});
`

/**
 * Mostrar el comando en consola
 */
export function printClearCommand() {
  console.log('%c========== COMANDO PARA LIMPIAR DATOS ==========', 'color: red; font-size: 14px; font-weight: bold;')
  console.log('%cCopia y pega esto en la consola del navegador:', 'color: orange; font-size: 12px;')
  console.log(CONSOLE_COMMAND)
  console.log('%c==============================================', 'color: red; font-size: 14px; font-weight: bold;')
}
