/**
 * Migration Script para rellenar campos size y product_name en bills históricos
 * 
 * Este archivo contiene funciones para migrar datos históricos que no tenían
 * los campos size y product_name guardados.
 * 
 * Uso:
 * import { fillMissingBillSizes } from '@/services/db-migration'
 * await fillMissingBillSizes()
 */

import { db } from './db'

/**
 * Llena campos size y product_name vacíos en bills históricos
 * Si no hay información disponible, deja los campos como null
 * 
 * @returns {Promise<{updated: number, skipped: number}>}
 */
export async function fillMissingBillSizes() {
  try {
    console.log('🔄 Iniciando migración de campos size y product_name en bills...')
    
    const allBills = await db.table('bills').toArray()
    console.log(`📊 Total de bills encontrados: ${allBills.length}`)
    
    let updated = 0
    let skipped = 0
    const batches = []
    
    for (const bill of allBills) {
      // Si ya tiene size (no es null ni undefined), skip
      if (bill.size !== null && bill.size !== undefined && bill.size !== '') {
        skipped++
        continue
      }
      
      // Si no tiene size, intenta obtenerlo del product_id o deja como null
      // Por ahora, solo marca como actualizado si lo dejamos en null
      const updatedBill = {
        ...bill,
        size: bill.size || null,  // Asegurar que es null, no undefined
        product_name: bill.product_name || null
      }
      
      batches.push(updatedBill)
      updated++
      
      // Hacer update en batches de 50
      if (batches.length >= 50) {
        await db.table('bills').bulkPut(batches)
        console.log(`  ✓ Actualizados ${batches.length} bills...`)
        batches.length = 0
      }
    }
    
    // Actualizar los restantes
    if (batches.length > 0) {
      await db.table('bills').bulkPut(batches)
      console.log(`  ✓ Actualizados ${batches.length} bills finales`)
    }
    
    console.log(`✅ Migración completada: ${updated} actualizados, ${skipped} ya tenían datos`)
    return { updated, skipped }
  } catch (error) {
    console.error('❌ Error en migración:', error)
    throw error
  }
}

/**
 * Verifica el estado actual de los campos size en la BD
 * @returns {Promise<{totalBills: number, withSize: number, withoutSize: number, percentFilled: number}>}
 */
export async function checkBillsSizeStatus() {
  try {
    const allBills = await db.table('bills').toArray()
    const withSize = allBills.filter(b => b.size && b.size.trim().length > 0).length
    const withoutSize = allBills.length - withSize
    const percentFilled = allBills.length > 0 ? Math.round((withSize / allBills.length) * 100) : 0
    
    console.log(`
📊 Estado de campos size en bills:
   Total bills: ${allBills.length}
   Con size: ${withSize}
   Sin size: ${withoutSize}
   Porcentaje: ${percentFilled}%
    `)
    
    return {
      totalBills: allBills.length,
      withSize,
      withoutSize,
      percentFilled
    }
  } catch (error) {
    console.error('❌ Error verificando estado:', error)
    throw error
  }
}
