import { supabase } from './supabaseClient'
import {
  getDirty,
  markClean,
  bulkUpsert,
  setMeta,
  db,
  bulkUpsertCustomers,
  getDirtyCustomers,
  markCustomersClean,
  getDirtySales,
  markSalesClean,
  getDirtyBills,
  markBillsClean,
  bulkUpsertBills
} from './db'

// ⏱️ THROTTLE: Evitar que syncAll se ejecute demasiadas veces
let lastSyncTime = 0
const SYNC_THROTTLE_MS = 60_000 // Esperar 60 segundos entre syncs completos
let isSyncing = false

const SUPABASE_SCHEMA = 'public'
const SUPABASE_TABLE = 'product'
const REMOTE_TABLE = `${SUPABASE_SCHEMA}.${SUPABASE_TABLE}`
const LAST_SYNC_KEY = 'public.product:lastSyncedAt'
const SIZE_FIELDS = ['xs', 's', 'm', 'l', 'xl']
const CUSTOMER_TABLE = 'customer'
const CUSTOMER_REMOTE_TABLE = `${SUPABASE_SCHEMA}.${CUSTOMER_TABLE}`
const CUSTOMER_LAST_SYNC_KEY = 'public.customer:lastSyncedAt'
const SALE_TABLE = 'sale'
const SALE_REMOTE_TABLE = `${SUPABASE_SCHEMA}.${SALE_TABLE}`
const SALE_LAST_SYNC_KEY = 'public.sale:lastSyncedAt'
const BILL_TABLE = 'bill'
const BILL_REMOTE_TABLE = `${SUPABASE_SCHEMA}.${BILL_TABLE}`
const BILL_LAST_SYNC_KEY = 'public.bill:lastSyncedAt'

const ensureSize = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const computeQuantity = (record) =>
  SIZE_FIELDS.reduce((sum, size) => sum + (Number.isFinite(record[size]) ? record[size] : 0), 0)

export function mapIncoming(record) {
  const productId = record.product_id || record.id || ''
  const price = Number(record.price) || 0

  const sizes = SIZE_FIELDS.reduce((acc, size) => {
    acc[size] = ensureSize(record[`stock_${size}`])
    return acc
  }, {})

  // El campo en Supabase es 'gender_prod', no 'gender'
  const gender = record.gender_prod || record.gender || 'Unisex'

  return {
    id: productId,
    item: productId,
    title: record.product_name || productId,
    price,
    description: record.description || '',
    gender: gender,
    gender_prod: gender,
    quantity: computeQuantity(sizes),
    dirty: 0,
    deleted: 0,
    ...sizes
  }
}

export function mapLocalToCloud(item) {
  const productId = String(item.item || item.id || '').trim().slice(0, 15)
  const sizes = SIZE_FIELDS.reduce((acc, size) => {
    acc[`stock_${size}`] = ensureSize(item[size])
    return acc
  }, {})

  return {
    product_id: productId,
    product_name: item.title || item.product_name || productId,
    price: Number.parseInt(item.price ?? item.precio ?? 0, 10) || 0,
    gender_prod: item.gender_prod || item.gender || 'Unisex',
    ...sizes
  }
}

// Mapeo de clientes desde Supabase al formato local
// Columnas en Supabase (esquema trendo, tabla customer):
// customer_id (PK), customer_type, identification_type, first_name, second_name,
// last_name, second_last_name, email, address, phone_indicative, phone_number
function mapCustomerIncoming(record) {
  const customerId = record.customer_id || record.id
  return {
    id: customerId,
    customer_id: customerId,
    identificationNumber: customerId, // Para compatibilidad
    identificationType: record.identification_type || '',
    identification_type: record.identification_type || '',
    type: record.customer_type || 'Persona',
    customer_type: record.customer_type || 'Persona',
    first_name: record.first_name || '',
    second_name: record.second_name || '',
    last_name: record.last_name || '',
    second_last_name: record.second_last_name || '',
    // Campos legacy para compatibilidad
    nombres: record.first_name || '',
    apellidos: record.last_name || '',
    razonSocial: record.business_name || '',
    email: record.email || '',
    address: record.address || '',
    phone_indicative: record.phone_indicative || '+57',
    phone_number: record.phone_number || '',
    phoneIndicative: record.phone_indicative || '+57',
    phoneNumber: record.phone_number || '',
    dirty: 0,
    deleted: record.deleted ? 1 : 0,
    synced: true
  }
}

function mapCustomerLocalToCloud(customer) {
  const customerId = customer.customer_id || customer.identificationNumber || customer.id
  return {
    customer_id: customerId,
    customer_type: customer.customer_type || customer.type || 'Persona',
    identification_type: customer.identification_type || customer.identificationType || 'CC',
    first_name: customer.first_name || customer.nombres || null,
    second_name: customer.second_name || null,
    last_name: customer.last_name || customer.apellidos || null,
    second_last_name: customer.second_last_name || null,
    email: customer.email || null,
    address: customer.address || null,
    phone_indicative: customer.phone_indicative || customer.phoneIndicative || '+57',
    phone_number: customer.phone_number || customer.phoneNumber || null
  }
}

// Mapeo de ventas desde local a Supabase
// ⚠️ IMPORTANTE: La tabla trendo.sale en Supabase SOLO tiene estas columnas:
// consecutive (PK auto-generado), sale_date, customer_document, employee_document
function mapSaleLocalToCloud(sale) {
  const empDoc = sale.employeeDocument?.trim()
  const custDoc = sale.customerId?.trim?.() || sale.customerId
  
  return {
    sale_date: new Date(sale.created_at || new Date()).toISOString().split('T')[0],
    customer_document: custDoc ? String(custDoc).slice(0, 50) : null,
    employee_document: empDoc ? String(empDoc).slice(0, 50) : null
  }
}

// Mapeo de bill desde local a Supabase
// Las columnas en trendo.bill: id, line_item, quantity, price, type_transaction,
// sale_consecutive, buy_consecutive, product_id, customer_document, created_at, deleted
function mapBillLocalToCloud(bill) {
  // Enviar sale_consecutive tal como está (puede ser UUID o número)
  const saleConsecutive = bill.sale_consecutive || null
  
  return {
    line_item: parseInt(bill.line_item) || 1,
    quantity: parseFloat(bill.quantity) || 0,
    price: parseFloat(bill.price) || 0,
    type_transaction: bill.type_transaction || 'efectivo',
    sale_consecutive: saleConsecutive,
    buy_consecutive: bill.buy_consecutive ? parseInt(bill.buy_consecutive) : null,
    product_id: bill.product_id ? String(bill.product_id) : null,
    customer_document: bill.customer_document && bill.customer_document.trim() ? String(bill.customer_document) : null,
    product_name: bill.product_name ? String(bill.product_name) : null,
    size: bill.size ? String(bill.size).toLowerCase() : null
  }
}

function remoteBillTable() {
  return supabase.schema(SUPABASE_SCHEMA).from(BILL_TABLE)
}

export async function pushBillsToCloud() {
  const dirty = await getDirtyBills()
  if (dirty.length === 0) return { count: 0 }

  console.log(`📤 Sincronizando ${dirty.length} detalles de factura a Supabase...`)

  try {
    // Primero, intentar descubrir la estructura de la tabla
    console.log('🔍 Intentando obtener estructura de tabla bill...')
    const { data: sampleData, error: sampleError } = await remoteBillTable()
      .select('*')
      .limit(1)
    
    if (!sampleError && sampleData && sampleData.length > 0) {
      console.log('� Estructura detectada de bill:', Object.keys(sampleData[0]))
    }

    const payload = dirty
      .map(mapBillLocalToCloud)
      .map(bill => {
        // Remover campos NULL para evitar conflictos con foreign keys
        return Object.fromEntries(
          Object.entries(bill).filter(([_, v]) => v !== null)
        )
      })
    console.log('📋 Intentando insertar con estructura:', Object.keys(payload[0]))
    
    // Con UNRESTRICTED, hacer insert directo
    const { error } = await remoteBillTable().insert(payload)

    if (error) {
      console.error('❌ Error sincronizando bills:', error)
      console.warn('⚠️ RLS o estructura de tabla pueden estar limitando upserts - datos guardados localmente')
      // No lanzar error, los bills ya están en BD local
      return { count: 0 }
    }

    console.log(`✅ ${dirty.length} detalles de factura sincronizados`)
    await markBillsClean(dirty.map(b => b.id))
    await setMeta(BILL_LAST_SYNC_KEY, new Date().toISOString())

    return { count: dirty.length }
  } catch (error) {
    console.error('❌ Push bills error (ignorado):', error)
    // No lanzar error para que syncAll pueda continuar
    return { count: 0 }
  }
}

export async function pullBillsFromCloud() {
  console.log(`🔄 Sincronizando bills desde Supabase...`)

  try {
    // ⚠️ La tabla bill en Supabase tiene estructura desconocida
    // Obtener solo las columnas disponibles sin filtrar
    const { data, error } = await remoteBillTable()
      .select('*')
      .limit(100)

    if (error) {
      console.error('❌ Error obteniendo bills:', error)
      console.warn('⚠️ Ignorando error de pull bills - los datos están guardados localmente')
      // No lanzar error, los bills ya están en la BD local
      return { count: 0 }
    }

    if (!data || data.length === 0) {
      console.log('✅ No hay detalles de factura en Supabase')
      return { count: 0 }
    }

    console.log(`📥 Obtenidos ${data.length} detalles de factura de Supabase`)
    await bulkUpsertBills(data)
    await setMeta(BILL_LAST_SYNC_KEY, new Date().toISOString())

    return { count: data.length }
  } catch (error) {
    console.error('❌ Pull bills error (ignorado):', error)
    // No lanzar error para que syncAll pueda continuar
    return { count: 0 }
  }
}

function getMeta(key, defaultValue = null) {
  return db.table('meta').get(key).then(record => record?.value ?? defaultValue)
}

function remoteTable() {
  return supabase.schema(SUPABASE_SCHEMA).from(SUPABASE_TABLE)
}

export async function pullFromCloud() {
  // ⏸️ DESACTIVADO EN MODO LOCAL
  return 0
}

export async function pushToCloud() {
  // ⏸️ DESACTIVADO EN MODO LOCAL
  return 0
}

/* PUSH A SUPABASE - COMENTARIZADA
export async function pushToCloud() {
  try {
    const dirty = await getDirty()
    if (dirty.length === 0) {
      console.log('✓ No hay productos sin sincronizar')
      return 0
    }

    console.log(`📨 Sincronizando ${dirty.length} producto(s) a Supabase...`)

    const deletions = dirty.filter((item) => item.deleted === 1 || item.deleted === true)
    const updates = dirty.filter((item) => !deletions.includes(item))

    if (deletions.length) {
      const remoteIds = deletions
        .map((item) => String(item.item || item.id || '').trim())
        .filter((value) => value.length > 0)

      const localIds = deletions
        .map((item) => item.id)
        .filter((value) => typeof value !== 'undefined')

      if (remoteIds.length) {
        console.log(`🗑️ Eliminando ${remoteIds.length} producto(s) de Supabase...`)
        const { error: deleteError } = await supabase
          .from('product')
          .delete()
          .in('product_id', remoteIds)

        if (deleteError) {
          console.error('❌ Error eliminando productos:', deleteError)
          throw deleteError
        }
        console.log(`✅ ${remoteIds.length} producto(s) eliminado(s)`)
      }

      if (localIds.length) {
        await db.items.bulkDelete(localIds)
      }
    }

    if (updates.length) {
      console.log(`📝 Subiendo ${updates.length} producto(s)...`)
      const toUpsert = updates.map(mapLocalToCloud)
      const { error, data } = await supabase
        .from('product')
        .upsert(toUpsert, { onConflict: 'product_id' })

      if (error) {
        console.error('❌ Error subiendo productos:', error)
        throw error
      }
      
      console.log(`✅ ${updates.length} producto(s) sincronizado(s)`)
      await markClean(updates.map((item) => item.id))
    }

    return updates.length + deletions.length
  } catch (error) {
    console.error('❌ Error en pushToCloud:', error)
    return 0
  }
}
*/

function remoteCustomerTable() {
  return supabase.schema(SUPABASE_SCHEMA).from(CUSTOMER_TABLE)
}

export async function pullCustomersFromCloud() {
  // ⏸️ DESACTIVADO EN MODO LOCAL
  return 0
}

export async function pushCustomersToCloud() {
  // ⏸️ DESACTIVADO EN MODO LOCAL
  return 0
}

/* PUSH CUSTOMERS A SUPABASE - COMENTARIZADA
export async function pushCustomersToCloud() {
  const dirty = await getDirtyCustomers()
  console.log('🔍 Clientes sucios encontrados:', dirty.length)
  if (dirty.length === 0) {
    console.log('✓ No hay clientes sin sincronizar')
    return 0
  }

  const toUpsert = dirty
    .filter((customer) => !customer.deleted)
    .map(mapCustomerLocalToCloud)

  if (toUpsert.length) {
    try {
      console.log(`📨 Sincronizando ${toUpsert.length} cliente(s) a Supabase:`, toUpsert)
      const { data, error } = await supabase
        .from('customer')
        .upsert(toUpsert, { onConflict: 'customer_id' })
      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }
      console.log(`✅ ${toUpsert.length} cliente(s) sincronizado(s) correctamente:`, data)
    } catch (err) {
      console.error('❌ Error sincronizando clientes:', err.message)
      throw err
    }
  }

  await markCustomersClean(dirty.map((customer) => customer.id))
  return dirty.length
}
*/

export async function pushSalesToCloud() {
  // ⏸️ DESACTIVADO EN MODO LOCAL
  return 0
}

/* PUSH SALES A SUPABASE - COMENTARIZADA
export async function pushSalesToCloud() {
  const dirty = await getDirtySales()
  console.log('🔍 Ventas sucias encontradas:', dirty.length)
  if (dirty.length === 0) {
    console.log('✓ No hay ventas sin sincronizar')
    return 0
  }

  const toUpsert = dirty
    .filter((sale) => !sale.deleted)
    .map(sale => {
      const mapped = mapSaleLocalToCloud(sale)
      console.log('📤 Venta a sincronizar:', {
        id: sale.id,
        total: sale.total,
        method: sale.method,
        customerId: sale.customerId,
        employeeDocument: sale.employeeDocument,
        mapped
      })
      return mapped
    })

  if (toUpsert.length) {
    try {
      console.log(`📨 Insertando ${toUpsert.length} venta(s) en Supabase...`)
      const { data, error } = await supabase
        .from('sale')
        .insert(toUpsert)
      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }
      console.log(`✅ ${toUpsert.length} venta(s) sincronizada(s) correctamente:`, data)
    } catch (err) {
      console.error('❌ Error sincronizando ventas:', err.message)
      throw err
    }
  }

  await markSalesClean(dirty.map((sale) => sale.id))
  return dirty.length
}
*/

export async function syncAll() {
  // ⏸️ MODO LOCAL: Todas las sincronizaciones con Supabase están desactivadas
  // El software funciona completamente en modo offline/local
  // Los datos se guardan solo en IndexedDB (local)
  console.log('⏸️ Supabase sync desactivado - Modo LOCAL')
  return
}

/* SINCRONIZACIÓN A SUPABASE - COMENTARIZADA
export async function syncAll() {
  const now = Date.now()
  const timeSinceLastSync = now - lastSyncTime
  
  if (isSyncing) {
    console.log('⏳ Sincronización en progreso, ignorando nueva solicitud')
    return
  }
  
  if (timeSinceLastSync < SYNC_THROTTLE_MS) {
    console.log(`⏱️ Sync throttled: espera ${Math.round((SYNC_THROTTLE_MS - timeSinceLastSync) / 1000)}s más`)
    return
  }
  
  isSyncing = true
  lastSyncTime = now
  console.log('🔄 Iniciando sincronización con Supabase...')
  
  try {
    await pushToCloud()
  } catch (error) {
    console.error('sync push error', error)
  }
  
  try {
    await pushCustomersToCloud()
  } catch (error) {
    console.error('sync customer push error', error)
  }
  
  try {
    await pushSalesToCloud()
  } catch (error) {
    console.error('sync sales push error', error)
  }
  
  try {
    await pushBillsToCloud()
  } catch (error) {
    console.error('sync bills push error', error)
  }
  
  try {
    await pullFromCloud()
  } catch (error) {
    console.error('sync pull error', error)
  }
  
  try {
    await pullCustomersFromCloud()
  } catch (error) {
    console.error('sync customer pull error', error)
  }
  
  console.log('✅ Ciclo de sincronización completado')
  isSyncing = false
}
*/

export async function purgeLegacyItems() {
  const all = await db.items.toArray()
  const staleIds = all
    .filter((it) => it.dirty === 1 && typeof it.item === 'string' && it.item.includes('-'))
    .map((it) => it.id)

  if (staleIds.length) {
    await db.items.bulkDelete(staleIds)
  }
}

export async function clearCatalog() {
  return null
}

export function watchRealtime() {
  return () => {}
}

export function onConnectivityChange(callback) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.forceSync = syncAll
  window.purgeLegacyItems = purgeLegacyItems
  window.clearCatalog = clearCatalog
}
