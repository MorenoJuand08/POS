import { supabase } from './supabaseClient'

const SCHEMA = 'public'
const TABLE = 'bill'

const trim = (value) => {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text.length ? text : null
}

/**
 * Mapea los datos del formulario local a las columnas de Supabase
 * Columnas en Supabase (esquema public, tabla bill):
 * - id (PK) - UUID
 * - line_item - Número de línea en la factura
 * - quantity - Cantidad de productos
 * - price - Precio unitario o total del producto
 * - type_transaction - Método de pago (efectivo, transferencia, tarjeta débito, tarjeta crédito)
 * - sale_consecutive - Número consecutivo de la venta
 * - buy_consecutive - Número consecutivo de la compra
 * - product_id - ID del producto
 * - customer_document - Número de documento del cliente
 * - created_at - Fecha de creación
 * - updated_at - Fecha de actualización
 */

function mapBillToCloud(bill) {
  return {
    line_item: bill.line_item || 1,
    quantity: parseFloat(bill.quantity) || 0,
    price: parseFloat(bill.price) || 0,
    type_transaction: trim(bill.type_transaction) || 'efectivo',
    sale_consecutive: bill.sale_consecutive ? parseInt(bill.sale_consecutive) : null,
    buy_consecutive: bill.buy_consecutive ? parseInt(bill.buy_consecutive) : null,
    product_id: trim(bill.product_id) || null,
    customer_document: trim(bill.customer_document) || null,
    dirty: 0,
    deleted: false
  }
}

function mapBillFromCloud(record) {
  if (!record) return null
  return {
    id: record.id,
    line_item: record.line_item || 1,
    quantity: record.quantity || 0,
    price: record.price || 0,
    type_transaction: record.type_transaction || 'efectivo',
    sale_consecutive: record.sale_consecutive,
    buy_consecutive: record.buy_consecutive,
    product_id: record.product_id,
    customer_document: record.customer_document,
    created_at: record.created_at,
    updated_at: record.updated_at,
    dirty: 0,
    deleted: 0,
    synced: true
  }
}

/**
 * Inserta un detalle de factura en Supabase
 * @param {Object} billData - Datos del detalle de factura
 * @returns {Promise<Object>} Datos del detalle insertado
 */
export async function insertBill(billData) {
  const payload = mapBillToCloud(billData)
  console.log('📤 Guardando detalle de factura en Supabase:', payload)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('❌ Error guardando detalle de factura:', error)
    throw error
  }

  console.log('✅ Detalle de factura guardado:', data)
  return mapBillFromCloud(data)
}

/**
 * Actualiza un detalle de factura en Supabase
 * @param {string} billId - ID del detalle de factura
 * @param {Object} billData - Datos a actualizar
 * @returns {Promise<Object>} Datos actualizados
 */
export async function updateBill(billId, billData) {
  const payload = mapBillToCloud(billData)
  console.log('📤 Actualizando detalle de factura:', billId, payload)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .update(payload)
    .eq('id', billId)
    .select()
    .single()

  if (error) {
    console.error('❌ Error actualizando detalle de factura:', error)
    throw error
  }

  console.log('✅ Detalle de factura actualizado:', data)
  return mapBillFromCloud(data)
}

/**
 * Obtiene todos los detalles de una factura de venta
 * @param {number} saleConsecutive - Número consecutivo de la venta
 * @returns {Promise<Array>} Lista de detalles de factura
 */
export async function getBillsByConsecutive(saleConsecutive) {
  console.log('🔍 Obteniendo detalles de factura para consecutive:', saleConsecutive)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*')
    .eq('sale_consecutive', saleConsecutive)
    .order('line_item', { ascending: true })

  if (error) {
    console.error('❌ Error obteniendo detalles de factura:', error)
    throw error
  }

  console.log('✅ Detalles de factura obtenidos:', data)
  return data ? data.map(mapBillFromCloud) : []
}

/**
 * Obtiene todos los detalles de una factura de compra
 * @param {number} buyConsecutive - Número consecutivo de la compra
 * @returns {Promise<Array>} Lista de detalles de factura
 */
export async function getBillsByBuyConsecutive(buyConsecutive) {
  console.log('🔍 Obteniendo detalles de compra para consecutive:', buyConsecutive)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*')
    .eq('buy_consecutive', buyConsecutive)
    .order('line_item', { ascending: true })

  if (error) {
    console.error('❌ Error obteniendo detalles de compra:', error)
    throw error
  }

  console.log('✅ Detalles de compra obtenidos:', data)
  return data ? data.map(mapBillFromCloud) : []
}

/**
 * Obtiene todos los detalles de un producto
 * @param {string} productId - ID del producto
 * @returns {Promise<Array>} Lista de detalles de factura con ese producto
 */
export async function getBillsByProduct(productId) {
  console.log('🔍 Obteniendo detalles de factura para producto:', productId)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error obteniendo detalles de producto:', error)
    throw error
  }

  console.log('✅ Detalles de producto obtenidos:', data)
  return data ? data.map(mapBillFromCloud) : []
}

/**
 * Obtiene todos los detalles de factura de un cliente
 * @param {string} customerDocument - Número de documento del cliente
 * @returns {Promise<Array>} Lista de detalles de factura del cliente
 */
export async function getBillsByCustomer(customerDocument) {
  console.log('🔍 Obteniendo detalles de factura para cliente:', customerDocument)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*')
    .eq('customer_document', customerDocument)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error obteniendo detalles de cliente:', error)
    throw error
  }

  console.log('✅ Detalles de cliente obtenidos:', data)
  return data ? data.map(mapBillFromCloud) : []
}

/**
 * Obtiene un detalle de factura por ID
 * @param {string} billId - ID del detalle de factura
 * @returns {Promise<Object>} Detalle de factura
 */
export async function getBillById(billId) {
  console.log('🔍 Obteniendo detalle de factura:', billId)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*')
    .eq('id', billId)
    .single()

  if (error) {
    console.error('❌ Error obteniendo detalle de factura:', error)
    throw error
  }

  console.log('✅ Detalle de factura obtenido:', data)
  return mapBillFromCloud(data)
}

/**
 * Elimina un detalle de factura (soft delete)
 * @param {string} billId - ID del detalle de factura
 * @returns {Promise<Object>} Detalle eliminado
 */
export async function deleteBill(billId) {
  console.log('🗑️ Eliminando detalle de factura:', billId)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .update({ deleted: true })
    .eq('id', billId)
    .select()
    .single()

  if (error) {
    console.error('❌ Error eliminando detalle de factura:', error)
    throw error
  }

  console.log('✅ Detalle de factura eliminado:', data)
  return mapBillFromCloud(data)
}

/**
 * Obtiene todas las facturas con paginación
 * @param {number} limit - Límite de registros
 * @param {number} offset - Offset para paginación
 * @returns {Promise<Array>} Lista de facturas
 */
export async function listBills(limit = 100, offset = 0) {
  console.log('📋 Listando facturas - limit:', limit, 'offset:', offset)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*')
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('❌ Error listando facturas:', error)
    throw error
  }

  console.log('✅ Facturas listadas:', data?.length)
  return data ? data.map(mapBillFromCloud) : []
}

/**
 * Obtiene el total de una factura de venta sumando quantity * price
 * @param {number} saleConsecutive - Número consecutivo de la venta
 * @returns {Promise<number>} Total de la factura
 */
export async function getTotal(saleConsecutive) {
  console.log('💰 Calculando total de factura:', saleConsecutive)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('quantity, price')
    .eq('sale_consecutive', saleConsecutive)
    .eq('deleted', false)

  if (error) {
    console.error('❌ Error calculando total:', error)
    throw error
  }

  const total = (data || []).reduce((sum, item) => {
    return sum + (item.quantity * item.price)
  }, 0)

  console.log('✅ Total calculado:', total)
  return total
}

/**
 * Cuenta los items en una factura
 * @param {number} saleConsecutive - Número consecutivo de la venta
 * @returns {Promise<number>} Cantidad de items
 */
export async function countItems(saleConsecutive) {
  console.log('📊 Contando items de factura:', saleConsecutive)

  const { count, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('sale_consecutive', saleConsecutive)
    .eq('deleted', false)

  if (error) {
    console.error('❌ Error contando items:', error)
    throw error
  }

  console.log('✅ Items contados:', count)
  return count || 0
}

/**
 * Inserta múltiples detalles de factura (batch)
 * @param {Array} bills - Array de detalles de factura
 * @returns {Promise<Array>} Detalles insertados
 */
export async function insertBillsBatch(bills) {
  console.log('📤 Insertando batch de detalles de factura:', bills.length)

  const payload = bills.map(mapBillToCloud)

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .insert(payload)
    .select()

  if (error) {
    console.error('❌ Error insertando batch:', error)
    throw error
  }

  console.log('✅ Batch insertado:', data?.length)
  return data ? data.map(mapBillFromCloud) : []
}
