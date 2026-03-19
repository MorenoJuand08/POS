import Dexie from 'dexie'
import { supabase } from './supabaseClient'

export const db = new Dexie('trendo_pos')

const SUPABASE_SCHEMA = 'public'
const CUSTOMER_TABLE = 'customer'

// Version 1: items + meta
// Version 2: returns table
// Version 3: add size fields to items (xs,s,m,l,xl) and maintain quantity as total
db.version(1).stores({
  items: 'id, updated_at, dirty, deleted',
  meta: 'key'
})

db.version(2).stores({
  items: 'id, updated_at, dirty, deleted',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted'
})

db.version(3).stores({
  items: 'id, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted'
}).upgrade(tx => {
  return tx.table('items').toCollection().modify(item => {
    // If size fields missing, initialize to 0
    item.xs = item.xs || 0
    item.s = item.s || 0
    item.m = item.m || 0
    item.l = item.l || 0
    item.xl = item.xl || 0
    // If quantity absent or inconsistent, set as sum of sizes
    const total = (item.xs + item.s + item.m + item.l + item.xl) || item.quantity || 0
    item.quantity = total
  })
})

// Version 4: add indexable field `item` (human-readable ITEM code)
db.version(4).stores({
  items: 'id, item, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted'
})

// Version 5: add sales table to record transactions (for reporting)
db.version(5).stores({
  items: 'id, item, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, dirty, deleted'
})

// Version 6: add gender field to items
db.version(6).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, dirty, deleted'
}).upgrade(tx => {
  return tx.table('items').toCollection().modify(item => {
    if (!item.gender) item.gender = 'Unisex'
  })
})

// Version 7: add shifts table to manage daily opening/closing of cash register
db.version(7).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active'
})

// Version 8: add shiftId to sales to associate transactions with shift
db.version(8).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active'
}).upgrade(tx => {
  // Ensure existing sales have shiftId initialized
  return tx.table('sales').toCollection().modify(s => {
    if (typeof s.shiftId === 'undefined') s.shiftId = ''
  })
})

// Version 9: add customers table + extend sales with customerId and tipoComprobante
db.version(9).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, customerId, tipoComprobante, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active',
  customers: 'id, identificationNumber, identificationType, type, email'
}).upgrade(tx => {
  return tx.table('sales').toCollection().modify(s => {
    if (typeof s.customerId === 'undefined') s.customerId = ''
    if (typeof s.tipoComprobante === 'undefined') s.tipoComprobante = ''
  })
})

// Version 10: add dirty/deleted flags and metadata to customers for cloud sync
db.version(10).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, customerId, tipoComprobante, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active',
  customers: 'id, identificationNumber, identificationType, type, email, dirty, deleted'
}).upgrade(tx => {
  return tx.table('customers').toCollection().modify(customer => {
    if (typeof customer.dirty === 'undefined') customer.dirty = 0
    if (typeof customer.deleted === 'undefined') customer.deleted = 0
    if (typeof customer.created_at === 'undefined') customer.created_at = customer.updated_at || new Date().toISOString()
    if (typeof customer.updated_at === 'undefined') customer.updated_at = new Date().toISOString()
  })
})

// Version 11: add bills table for detailed invoice/bill line items
db.version(11).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, customerId, tipoComprobante, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active',
  customers: 'id, identificationNumber, identificationType, type, email, dirty, deleted',
  bills: 'id, sale_consecutive, buy_consecutive, product_id, customer_document, created_at, dirty, deleted'
})

// Version 12: extend shifts table with audit fields (vouchersTotal, transfersVerified, notes, expectedCash, difference)
db.version(12).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, customerId, tipoComprobante, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active, vouchersTotal, transfersVerified, expectedCash, difference',
  customers: 'id, identificationNumber, identificationType, type, email, dirty, deleted',
  bills: 'id, sale_consecutive, buy_consecutive, product_id, customer_document, created_at, dirty, deleted'
}).upgrade(tx => {
  return tx.table('shifts').toCollection().modify(shift => {
    if (typeof shift.vouchersTotal === 'undefined') shift.vouchersTotal = 0
    if (typeof shift.transfersVerified === 'undefined') shift.transfersVerified = 0
    if (typeof shift.notes === 'undefined') shift.notes = ''
    if (typeof shift.expectedCash === 'undefined') shift.expectedCash = 0
    if (typeof shift.difference === 'undefined') shift.difference = 0
  })
})

// Version 13: add shiftId index to returns table for arqueo queries
db.version(13).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, shiftId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, customerId, tipoComprobante, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active, vouchersTotal, transfersVerified, expectedCash, difference',
  customers: 'id, identificationNumber, identificationType, type, email, dirty, deleted',
  bills: 'id, sale_consecutive, buy_consecutive, product_id, customer_document, created_at, dirty, deleted'
}).upgrade(tx => {
  return tx.table('returns').toCollection().modify(ret => {
    if (typeof ret.shiftId === 'undefined') ret.shiftId = null
  })
})

export async function getMeta(key, defaultValue = null) {
  const value = await db.table('meta').get(key)
  return value?.value ?? defaultValue
}

export async function setMeta(key, value) {
  return db.table('meta').put({ key, value })
}

export async function listItems() {
  return db.table('items').where('deleted').equals(0).toArray()
}

export async function upsertItem(item) {
  const now = new Date().toISOString()
  const total = (item.xs || 0) + (item.s || 0) + (item.m || 0) + (item.l || 0) + (item.xl || 0)
  // Normalizar género: usar gender_prod si existe, sino gender
  const gender = item.gender_prod || item.gender || 'Unisex'
  const toSave = {
    ...item,
    quantity: total || item.quantity || 0,
    updated_at: item.updated_at || now,
    dirty: 1,
    deleted: item.deleted ? 1 : 0,
    xs: item.xs || 0,
    s: item.s || 0,
    m: item.m || 0,
    l: item.l || 0,
    xl: item.xl || 0,
    gender: gender,
    gender_prod: gender
  }
  await db.table('items').put(toSave)
  return toSave
}

export async function markDeleted(id) {
  const now = new Date().toISOString()
  const table = db.table('items')
  const updated = await table.update(id, { deleted: 1, dirty: 1, updated_at: now })
  if (!updated) {
    await table.put({ id, deleted: 1, dirty: 1, updated_at: now })
  }
}

export async function removeItem(id) {
  if (!id) return
  await db.table('items').delete(id)
}

export async function bulkUpsert(items) {
  await db.table('items').bulkPut(items)
}

export async function getDirty() {
  return db.table('items').where('dirty').equals(1).toArray()
}

export async function markClean(ids) {
  await db.table('items').where('id').anyOf(ids).modify({ dirty: 0 })
}

// Stock adjustment by ITEM code and size (e.g., size = 'm', delta = -1 for a sale)
export async function adjustStockByItem(itemCode, size, delta) {
  if (!itemCode || !['xs','s','m','l','xl'].includes(size)) return null
  const tbl = db.table('items')
  const item = await tbl.where('item').equals(itemCode).first()
  if (!item) return null
  const next = { ...item }
  const curr = parseInt(next[size] || 0)
  const newVal = Math.max(0, curr + (parseInt(delta) || 0))
  next[size] = newVal
  next.quantity = (next.xs||0)+(next.s||0)+(next.m||0)+(next.l||0)+(next.xl||0)
  next.updated_at = new Date().toISOString()
  next.dirty = 1
  await tbl.put(next)
  return next
}

// Lookup by human-readable ITEM code
export async function findItemByCode(code) {
  if (!code) return null
  const normalized = String(code).trim().toLowerCase()
  if (!normalized) return null
  return db
    .table('items')
    .filter(item => {
      if (!item || item.deleted === 1) return false
      const current = String(item.item || '').trim().toLowerCase()
      return current === normalized
    })
    .first()
}

// Returns API
export async function listReturns() {
  return db.table('returns').where('deleted').equals(0).reverse().sortBy('created_at')
}

export async function addReturn({ itemId, reason, amount, purchased_at, shiftId, product_name, size, quantity, refund_amount }) {
  // Validate 30 day window
  try {
    const purchasedDate = new Date(purchased_at)
    const now = new Date()
    const diffDays = (now - purchasedDate) / (1000 * 60 * 60 * 24)
    if (diffDays > 30) throw new Error('La devolución excede los 30 días permitidos')
  } catch (e) {
    throw new Error(e.message || 'Fecha de compra inválida')
  }

  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const created_at = new Date().toISOString()
  const record = { 
    id, 
    itemId, 
    reason, 
    amount: parseFloat(amount) || parseFloat(refund_amount) || 0, 
    purchased_at, 
    created_at, 
    dirty: 1, 
    deleted: 0,
    // Campos adicionales para almacenar detalles completos
    shiftId: shiftId || null,
    product_name: product_name || '',
    size: size || '',
    quantity: quantity || 1,
    refund_amount: parseFloat(refund_amount) || parseFloat(amount) || 0
  }
  await db.table('returns').put(record)
  return record
}

export async function deleteReturn(id) {
  const now = new Date().toISOString()
  await db.table('returns').put({ id, deleted: 1, dirty: 1, created_at: now })
}

// Sales API
export async function addSale({ total, items, method, created_at, customerId, tipoComprobante, employeeDocument }) {
  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const now = new Date().toISOString()
  
  console.log('💾 addSale recibido:', {
    customerId,
    employeeDocument,
    tipoComprobante
  })
  
  // Attach current shift if active
  let shiftId = ''
  try {
    const active = await getActiveShift()
    if (active && active.id) shiftId = active.id
  } catch {
    // ignore shift attachment errors
  }
  const record = {
    id,
    total: parseFloat(total) || 0,
    items: parseInt(items) || 0,
    method: method || 'Efectivo',
    created_at: created_at || now,
    updated_at: now,
    shiftId,
    customerId: customerId || '',
    tipoComprobante: tipoComprobante || '',
    employeeDocument: employeeDocument || '',
    dirty: 1,
    deleted: 0
  }
  
  console.log('💾 Venta guardada localmente:', {
    employeeDocument: record.employeeDocument,
    customerId: record.customerId
  })
  
  await db.table('sales').put(record)
  return record
}

export async function listSales() {
  return db.table('sales').where('deleted').equals(0).reverse().sortBy('created_at')
}

export async function getDirtySales() {
  return db.table('sales').where('dirty').equals(1).toArray()
}

export async function markSalesClean(saleIds) {
  if (!saleIds || saleIds.length === 0) return
  await db.table('sales').bulkUpdate(saleIds.map(id => ({ key: id, changes: { dirty: 0 } })))
}

// Shifts API
export async function getActiveShift() {
  return db.table('shifts').where('active').equals(1).first()
}

export async function openShift({ userEmail, initialCash }) {
  const existing = await getActiveShift()
  if (existing) throw new Error('Ya hay un turno abierto')
  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const opened_at = new Date().toISOString()
  const record = {
    id,
    userEmail: userEmail || '',
    opened_at,
    closed_at: null,
    initialCash: parseFloat(initialCash) || 0,
    finalCash: 0,
    active: 1
  }
  await db.table('shifts').put(record)
  return record
}

export async function closeShift({
  finalCash,
  vouchersTotal = 0,
  transfersVerified = 0,
  notes = '',
  expectedCash = 0,
  difference = 0
}) {
  const active = await getActiveShift()
  if (!active) throw new Error('No hay turno activo')
  const closed_at = new Date().toISOString()
  active.closed_at = closed_at
  active.finalCash = parseFloat(finalCash) || 0
  active.active = 0
  active.vouchersTotal = parseFloat(vouchersTotal) || 0
  active.transfersVerified = parseFloat(transfersVerified) || 0
  active.notes = notes
  active.expectedCash = parseFloat(expectedCash) || 0
  active.difference = parseFloat(difference) || 0
  await db.table('shifts').put(active)
  return active
}

export async function listShifts(limit = 50) {
  return db.table('shifts').orderBy('opened_at').reverse().limit(limit).toArray()
}

function customerRemoteTable() {
  if (!supabase || supabase.__mock || typeof supabase.schema !== 'function') return null
  try {
    return supabase.schema(SUPABASE_SCHEMA).from(CUSTOMER_TABLE)
  } catch (error) {
    console.warn('Customer remote table unavailable', error)
    return null
  }
}

// Nota: Columnas de la tabla trendo.customer en Supabase:
// customer_id (PK), customer_type, identification_type, first_name, second_name,
// last_name, second_last_name, email, address, phone_indicative, phone_number
function mapCustomerFromCloud(record) {
  if (!record) return null
  const id = record.customer_id || record.id
  if (!id) return null
  return {
    id,
    customer_id: id,
    identificationNumber: id, // Para compatibilidad con código existente
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

function mapCustomerToCloud(customer) {
  const now = new Date().toISOString()
  // Extraer customer_id desde cualquier campo posible
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
    phone_number: customer.phone_number || customer.phoneNumber || null,
    created_at: customer.created_at || now,
    updated_at: now
  }
}

// Customers API
export async function upsertCustomer(c) {
  const now = new Date().toISOString()

  // El customer_id es el número de identificación (PK lógico en modo local)
  const customerId = c.customer_id || c.identificationNumber || c.id
  if (!customerId) {
    throw new Error('El número de identificación es requerido')
  }

  // Build payload similar to Supabase schema to reuse normalizers
  const payload = {
    customer_id: String(customerId).trim(),
    customer_type: c.customer_type || c.type || 'Persona',
    identification_type: c.identification_type || c.identificationType || 'CC',
    first_name: c.first_name || c.nombres || null,
    second_name: c.second_name || null,
    last_name: c.last_name || c.apellidos || null,
    second_last_name: c.second_last_name || null,
    email: c.email || null,
    address: c.address || null,
    phone_indicative: c.phone_indicative || c.phoneIndicative || '+57',
    phone_number: c.phone_number || c.phoneNumber || null,
    created_at: c.created_at || now,
    updated_at: now
  }

  console.log('💾 [MODO LOCAL] Guardando cliente en IndexedDB:', payload)

  const normalized = mapCustomerFromCloud(payload) || {
    id: payload.customer_id,
    customer_id: payload.customer_id,
    identificationNumber: payload.customer_id,
    identificationType: payload.identification_type,
    identification_type: payload.identification_type,
    type: payload.customer_type,
    customer_type: payload.customer_type,
    first_name: payload.first_name || '',
    second_name: payload.second_name || '',
    last_name: payload.last_name || '',
    second_last_name: payload.second_last_name || '',
    nombres: payload.first_name || '',
    apellidos: payload.last_name || '',
    email: payload.email || '',
    address: payload.address || '',
    phone_indicative: payload.phone_indicative || '+57',
    phone_number: payload.phone_number || '',
    phoneIndicative: payload.phone_indicative || '+57',
    phoneNumber: payload.phone_number || ''
  }

  const localRecord = {
    ...normalized,
    created_at: payload.created_at,
    updated_at: payload.updated_at,
    dirty: 0,
    synced: true
  }

  await db.table('customers').put(localRecord)

  return localRecord
}

export async function findCustomerByIdentification(identificationNumber) {
  if (!identificationNumber) return null
  const normalized = String(identificationNumber).trim()

  // Buscar únicamente en local (modo offline)
  const local = await db.table('customers').where('identificationNumber').equals(normalized).first()
  if (local) return local

  console.log('ℹ️ Cliente no encontrado en IndexedDB (modo local)')
  return null
}

export async function listCustomers(limit = 100) {
  return db.table('customers').where('deleted').notEqual(1).limit(limit).toArray()
}

export async function bulkUpsertCustomers(customers = []) {
  if (!Array.isArray(customers) || customers.length === 0) return
  await db.table('customers').bulkPut(customers.map((c) => ({ ...c, dirty: 0, deleted: c.deleted ? 1 : 0, synced: true })))
}

export async function getDirtyCustomers() {
  if (!db.table('customers')) return []
  return db.table('customers').where('dirty').equals(1).toArray()
}

export async function markCustomersClean(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return
  await db.table('customers').where('id').anyOf(ids).modify({ dirty: 0, synced: true })
}

// Stub DIAN data fetch - in real implementation would call external API
export async function fetchDianData(identificationType, identificationNumber) {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 400)) // eslint-disable-line no-undef
  // Return mock data based on type
  if (!identificationNumber) return null
  // const num = String(identificationNumber)
  if (identificationType === 'NIT') {
    return {
      type: 'Empresa',
      razonSocial: 'EMPRESA DEMO S.A.S.',
      email: 'contacto@empresademo.com',
      phoneIndicative: '+57',
      phoneNumber: '3001234567'
    }
  }
  return {
    type: 'Persona',
    nombres: 'Juan',
    apellidos: 'Pérez',
    email: 'juan.perez@example.com',
    phoneIndicative: '+57',
    phoneNumber: '3009876543'
  }
}

// Bills API
// Obtener el siguiente line_item global (consecutivo único para toda la tabla)
export async function getNextLineItem() {
  const allBills = await db.table('bills').toArray()
  if (allBills.length === 0) return 1
  const maxLineItem = Math.max(...allBills.map(b => b.line_item || 0))
  return maxLineItem + 1
}

export async function addBill(billData) {
  const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
  const now = new Date().toISOString()
  
  // Obtener el siguiente line_item consecutivo global
  const nextLineItem = await getNextLineItem()
  
  const bill = {
    id,
    line_item: nextLineItem, // Usar consecutivo global único
    quantity: billData.quantity || 0,
    price: billData.price || 0,
    type_transaction: billData.type_transaction || 'efectivo',
    sale_consecutive: billData.sale_consecutive || null,
    buy_consecutive: billData.buy_consecutive || null,
    product_id: billData.product_id || null,
    customer_document: billData.customer_document !== undefined ? billData.customer_document : '', // Preservar cadena vacía, NO convertir a null
    product_name: billData.product_name || null,
    size: billData.size || null,
    created_at: now,
    updated_at: now,
    dirty: 1,
    deleted: 0,
    synced: false
  }
  
  await db.table('bills').add(bill)
  return bill
}

export async function upsertBill(bill) {
  const now = new Date().toISOString()
  
  const toSave = {
    ...bill,
    updated_at: bill.updated_at || now,
    dirty: 1,
    deleted: bill.deleted ? 1 : 0,
    synced: false
  }
  
  await db.table('bills').put(toSave)
  return toSave
}

export async function getBillById(billId) {
  return db.table('bills').get(billId)
}

export async function getBillsBySaleConsecutive(saleConsecutive) {
  return db.table('bills')
    .where('sale_consecutive')
    .equals(saleConsecutive)
    .filter(bill => bill.deleted === 0)
    .toArray()
}

export async function getBillsByBuyConsecutive(buyConsecutive) {
  return db.table('bills')
    .where('buy_consecutive')
    .equals(buyConsecutive)
    .filter(bill => bill.deleted === 0)
    .toArray()
}

export async function getBillsByProduct(productId) {
  return db.table('bills')
    .where('product_id')
    .equals(productId)
    .filter(bill => bill.deleted === 0)
    .toArray()
}

export async function getBillsByCustomer(customerDocument) {
  return db.table('bills')
    .where('customer_document')
    .equals(customerDocument)
    .filter(bill => bill.deleted === 0)
    .toArray()
}

export async function listBills(limit = 100) {
  return db.table('bills')
    .where('deleted')
    .equals(0)
    .reverse()
    .limit(limit)
    .toArray()
}

export async function deleteBill(billId) {
  const bill = await db.table('bills').get(billId)
  if (bill) {
    bill.deleted = 1
    bill.dirty = 1
    await db.table('bills').put(bill)
  }
  return bill
}

export async function getDirtyBills() {
  return db.table('bills').where('dirty').equals(1).toArray()
}

export async function markBillsClean(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return
  await db.table('bills').where('id').anyOf(ids).modify({ dirty: 0, synced: true })
}

export async function bulkUpsertBills(bills = []) {
  if (!Array.isArray(bills) || bills.length === 0) return
  const now = new Date().toISOString()
  const toInsert = bills.map(bill => ({
    ...bill,
    updated_at: bill.updated_at || now,
    dirty: 0,
    deleted: bill.deleted ? 1 : 0,
    synced: true
  }))
  await db.table('bills').bulkPut(toInsert)
}

// Obtener ventas por identificación del cliente
export async function getSalesByCustomerId(customerId) {
  return db.table('sales').where('customerId').equals(customerId).toArray()
}

// Obtener bills por sale_consecutive (para ver detalles de la venta)
export async function getBillsBySaleId(saleId) {
  return db.table('bills').where('sale_consecutive').equals(saleId).toArray()
}
