import { supabase } from './supabaseClient'

const SCHEMA = 'public'
const TABLE = 'customer'

const trim = (value) => {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text.length ? text : null
}

/**
 * Mapea los datos del formulario local a las columnas de Supabase
 * Columnas en Supabase (esquema trendo, tabla customer):
 * - customer_id (PK) - Número de identificación
 * - customer_type - Tipo de cliente (Persona/Empresa)
 * - identification_type - Tipo de identificación (CC, NIT, etc.)
 * - first_name - Primer nombre
 * - second_name - Segundo nombre
 * - last_name - Primer apellido
 * - second_last_name - Segundo apellido
 * - email - Correo electrónico
 * - address - Dirección
 * - phone_indicative - Indicativo telefónico (+57, etc.)
 * - phone_number - Número de celular
 */
const mapToCloud = (form) => {
  // customer_id es el número de identificación (PK)
  const customerId = trim(
    form.customer_id ??
    form.identNumber ??
    form.identificationNumber ??
    form.identification ??
    form.id
  )

  if (!customerId) {
    throw new Error('El número de identificación es requerido')
  }

  return {
    customer_id: customerId,
    customer_type: trim(form.customer_type ?? form.clientType ?? form.type) || 'Persona',
    identification_type: trim(form.identification_type ?? form.identType ?? form.identificationType) || 'CC',
    first_name: trim(form.first_name ?? form.firstName),
    second_name: trim(form.second_name ?? form.secondName),
    last_name: trim(form.last_name ?? form.lastName),
    second_last_name: trim(form.second_last_name ?? form.secondLastName),
    email: trim(form.email),
    address: trim(form.address),
    phone_indicative: trim(form.phone_indicative ?? form.phoneIndicative) || '+57',
    phone_number: trim(form.phone_number ?? form.phoneNumber)
  }
}

/**
 * Mapea los datos de Supabase al formato local del formulario
 */
const mapFromCloud = (record) => {
  if (!record) return null
  return {
    customer_id: record.customer_id,
    customer_type: record.customer_type || 'Persona',
    identification_type: record.identification_type || 'CC',
    first_name: record.first_name || '',
    second_name: record.second_name || '',
    last_name: record.last_name || '',
    second_last_name: record.second_last_name || '',
    email: record.email || '',
    address: record.address || '',
    phone_indicative: record.phone_indicative || '+57',
    phone_number: record.phone_number || ''
  }
}

export async function upsertCustomerToCloud(form) {
  const payload = mapToCloud(form)
  console.log('📤 Guardando cliente en Supabase:', payload)
  
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .upsert(payload, { onConflict: 'customer_id' })
    .select()
    .single()
  
  if (error) {
    console.error('❌ Error guardando cliente:', error)
    throw error
  }
  
  console.log('✅ Cliente guardado:', data)
  return mapFromCloud(data)
}

export async function fetchCustomerByIdentification(identification) {
  const doc = trim(identification)
  if (!doc) return null
  
  console.log('🔍 Buscando cliente por ID:', doc)
  
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select('*')
    .eq('customer_id', doc)
    .maybeSingle()
  
  if (error) {
    console.error('❌ Error buscando cliente:', error)
    throw error
  }
  
  if (data) {
    console.log('✅ Cliente encontrado:', data)
  } else {
    console.log('ℹ️ Cliente no encontrado')
  }
  
  return mapFromCloud(data)
}

export const upsertCustomer = upsertCustomerToCloud