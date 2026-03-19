import { supabase } from './supabaseClient'
import { pushSalesToCloud } from './sync'

const SUPABASE_SCHEMA = 'public'
const SALE_TABLE = 'sale'
const SALE_REMOTE_TABLE = `${SUPABASE_SCHEMA}.${SALE_TABLE}`

/**
 * Inserta una nueva venta en Supabase y sincroniza automáticamente
 * @param {Object} saleData - Datos de la venta
 * @param {string} saleData.sale_date - Fecha de la venta (YYYY-MM-DD)
 * @param {string} saleData.customer_document - Número de documento del cliente (opcional, máx 15 caracteres)
 * @param {string} saleData.employee_document - Número de documento del empleado (opcional, máx 15 caracteres)
 * @returns {Promise<Object>} Datos de la venta insertada con su consecutive
 */
export async function insertSale({ sale_date, customer_document = null, employee_document = null }) {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .insert([
      {
        sale_date,
        customer_document: customer_document ? String(customer_document).slice(0, 15) : null,
        employee_document: employee_document ? String(employee_document).slice(0, 15) : null
      }
    ])
    .select()

  if (error) {
    console.error('Error inserting sale:', error)
    throw error
  }

  // Sincronizar automáticamente después de insertar
  try {
    await pushSalesToCloud()
  } catch (syncError) {
    console.warn('Error sincronizing sales:', syncError)
  }

  return data?.[0] || null
}

/**
 * Obtiene todas las ventas
 * @param {Object} options - Opciones de búsqueda
 * @param {string} options.from_date - Fecha inicial (YYYY-MM-DD)
 * @param {string} options.to_date - Fecha final (YYYY-MM-DD)
 * @param {string} options.customer_document - Filtrar por documento del cliente
 * @returns {Promise<Array>} Lista de ventas
 */
export async function getSales({ from_date = null, to_date = null, customer_document = null } = {}) {
  let query = supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .select('*')

  if (from_date) {
    query = query.gte('sale_date', from_date)
  }

  if (to_date) {
    query = query.lte('sale_date', to_date)
  }

  if (customer_document) {
    query = query.eq('customer_document', customer_document)
  }

  const { data, error } = await query.order('consecutive', { ascending: false })

  if (error) {
    console.error('Error fetching sales:', error)
    throw error
  }

  return data || []
}

/**
 * Obtiene una venta específica por su consecutive
 * @param {number} consecutive - Número consecutivo de la venta
 * @returns {Promise<Object>} Datos de la venta
 */
export async function getSaleByConsecutive(consecutive) {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .select('*')
    .eq('consecutive', consecutive)
    .single()

  if (error) {
    console.error('Error fetching sale:', error)
    throw error
  }

  return data || null
}

/**
 * Obtiene ventas por cliente
 * @param {string} customer_document - Número de documento del cliente
 * @returns {Promise<Array>} Lista de ventas del cliente
 */
export async function getSalesByCustomer(customer_document) {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .select('*')
    .eq('customer_document', String(customer_document).slice(0, 15))
    .order('consecutive', { ascending: false })

  if (error) {
    console.error('Error fetching sales by customer:', error)
    throw error
  }

  return data || []
}

/**
 * Obtiene ventas por empleado
 * @param {string} employee_document - Número de documento del empleado
 * @returns {Promise<Array>} Lista de ventas del empleado
 */
export async function getSalesByEmployee(employee_document) {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .select('*')
    .eq('employee_document', employee_document)
    .order('consecutive', { ascending: false })

  if (error) {
    console.error('Error fetching sales by employee:', error)
    throw error
  }

  return data || []
}

/**
 * Obtiene ventas dentro de un rango de fechas
 * @param {string} from_date - Fecha inicial (YYYY-MM-DD)
 * @param {string} to_date - Fecha final (YYYY-MM-DD)
 * @returns {Promise<Array>} Lista de ventas en el rango
 */
export async function getSalesByDateRange(from_date, to_date) {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .select('*')
    .gte('sale_date', from_date)
    .lte('sale_date', to_date)
    .order('sale_date', { ascending: false })

  if (error) {
    console.error('Error fetching sales by date range:', error)
    throw error
  }

  return data || []
}

/**
 * Obtiene total de ventas por día
 * @param {string} from_date - Fecha inicial (YYYY-MM-DD)
 * @param {string} to_date - Fecha final (YYYY-MM-DD)
 * @returns {Promise<Array>} Total de ventas por día
 */
export async function getSalesSummaryByDay(from_date, to_date) {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .rpc('get_sales_summary_by_day', {
      from_date,
      to_date
    })

  if (error) {
    console.error('Error fetching sales summary:', error)
    // Fallback: obtener datos y procesarlos localmente
    const sales = await getSalesByDateRange(from_date, to_date)
    const summary = {}
    sales.forEach(sale => {
      summary[sale.sale_date] = (summary[sale.sale_date] || 0) + 1
    })
    return Object.entries(summary).map(([date, count]) => ({
      sale_date: date,
      total_sales: count
    }))
  }

  return data || []
}

/**
 * Actualiza el documento del empleado en una venta existente
 * @param {number} consecutive - Número consecutivo de la venta
 * @param {string} employee_document - Número de documento del empleado (máx 15 caracteres)
 * @returns {Promise<Object>} Venta actualizada
 */
export async function updateSaleEmployee(consecutive, employee_document) {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .update({ employee_document: employee_document ? String(employee_document).slice(0, 15) : null })
    .eq('consecutive', consecutive)
    .select()

  if (error) {
    console.error('Error updating sale employee:', error)
    throw error
  }

  return data?.[0] || null
}

/**
 * Obtiene el conteo total de ventas
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.from_date - Fecha inicial
 * @param {string} options.to_date - Fecha final
 * @returns {Promise<number>} Total de ventas
 */
export async function getTotalSalesCount({ from_date = null, to_date = null } = {}) {
  let query = supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .select('*', { count: 'exact', head: true })

  if (from_date) {
    query = query.gte('sale_date', from_date)
  }

  if (to_date) {
    query = query.lte('sale_date', to_date)
  }

  const { count, error } = await query

  if (error) {
    console.error('Error counting sales:', error)
    throw error
  }

  return count || 0
}

/**
 * Obtiene el último número consecutivo de ventas
 * @returns {Promise<number>} Último consecutivo registrado
 */
export async function getLastSaleConsecutive() {
  const { data, error } = await supabase
    .schema(SUPABASE_SCHEMA)
    .from(SALE_TABLE)
    .select('consecutive')
    .order('consecutive', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching last consecutive:', error)
    return 0
  }

  return data?.[0]?.consecutive || 0
}

/**
 * Realtime subscription a nuevas ventas
 * @param {Function} callback - Función a ejecutar cuando hay nuevas ventas
 * @returns {Function} Función para cancelar la suscripción
 */
export function onSaleInsert(callback) {
  const subscription = supabase
    .channel(`realtime:${SALE_REMOTE_TABLE}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: SUPABASE_SCHEMA, table: SALE_TABLE },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(subscription)
  }
}

export default {
  insertSale,
  getSales,
  getSaleByConsecutive,
  getSalesByCustomer,
  getSalesByEmployee,
  getSalesByDateRange,
  getSalesSummaryByDay,
  updateSaleEmployee,
  getTotalSalesCount,
  getLastSaleConsecutive,
  onSaleInsert
}
