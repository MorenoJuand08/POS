/* eslint-disable no-undef */
import { supabase } from './supabaseClient'

// Validación de seguridad
function ensureSupabase() {
  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('Cliente Supabase no disponible o mal configurado')
  }
}

const NORMALIZED_GENDERS = {
  hombre: 'Hombre',
  masculino: 'Hombre',
  mujer: 'Mujer',
  femenino: 'Mujer'
}

// Cambiar todas las referencias de 'public' a 'trendo'
const SUPABASE_SCHEMA = 'public';

/**
 * Guarda o actualiza un producto en el esquema 'trendo' de Supabase.
 */
export async function insertProductToCloud(productData) {
  // ⚠️ MODO LOCAL: Supabase sync desactivado
  // No se envía nada a la nube, solo devolvemos éxito
  console.log('💾 [MODO LOCAL] Producto guardado localmente:', productData?.product_name || productData?.title);
  
  return { 
    success: true, 
    data: productData 
  }
}

/**
 * Elimina producto de la nube.
 * Mejorado para aceptar tanto el ID suelto como el objeto completo del producto.
 */
export async function deleteProductFromCloud(productId) {
  // ⚠️ MODO LOCAL: Supabase sync desactivado
  // No se envía nada a la nube, solo devolvemos éxito
  console.log('🗑️ [MODO LOCAL] Producto eliminado localmente');
  
  return { success: true }
}

/**
 * Obtiene los productos de la nube y los adapta al formato local
 */
export async function getProductsFromCloud() {
  ensureSupabase()
  
  const { data, error } = await supabase
    .schema('public')
    .from('product')
    .select(`
      product_id,
      product_name,
      description,
      price,
      gender_prod,
      stock_xs,
      stock_s,
      stock_m,
      stock_l,
      stock_xl
    `)

  if (error) throw error
  
  const productosAdaptados = data.map(p => {
    const normalizedGender = NORMALIZED_GENDERS[(p.gender_prod || '').trim().toLowerCase()] || ''
    return {
      ...p,
      id: p.product_id,
      code: p.product_id,
      nombre: p.product_name,
      gender: normalizedGender,
      gender_prod: normalizedGender,
      
      // Formato BD
      stock_xs: p.stock_xs || 0,
      stock_s: p.stock_s || 0,
      stock_m: p.stock_m || 0,
      stock_l: p.stock_l || 0,
      stock_xl: p.stock_xl || 0,

      // Formato Corto
      xs: p.stock_xs || 0,
      s: p.stock_s || 0,
      m: p.stock_m || 0,
      l: p.stock_l || 0,
      xl: p.stock_xl || 0,

      // Objeto Tallas
      tallas: {
        xs: p.stock_xs || 0,
        s: p.stock_s || 0,
        m: p.stock_m || 0,
        l: p.stock_l || 0,
        xl: p.stock_xl || 0,
        stock_xs: p.stock_xs || 0,
        stock_s: p.stock_s || 0,
        stock_m: p.stock_m || 0,
        stock_l: p.stock_l || 0,
        stock_xl: p.stock_xl || 0
      }
    }
  })

  return productosAdaptados
}

/**
 * 📡 SUSCRIPCIÓN EN TIEMPO REAL (NUEVO)
 * Escucha cambios en la base de datos (Supabase) y avisa al software
 * para que se actualice automáticamente sin recargar.
 */
export function subscribeToInventory(callback) {
  ensureSupabase()

  console.log("📡 Conectando al canal de actualizaciones en tiempo real...");

  const channel = supabase
    .channel('cambios-inventario')
    .on(
      'postgres_changes',
      {
        event: '*', // Escuchar INSERT, UPDATE y DELETE
        schema: 'public',
        table: 'product'
      },
      (payload) => {
        // payload.eventType será 'INSERT', 'UPDATE' o 'DELETE'
        // payload.new tiene el dato nuevo (en insert/update)
        // payload.old tiene el dato viejo o el ID (en delete)
        console.log("🔔 Cambio en Nube recibido:", payload.eventType);
        
        // Pasamos el evento al callback para que el UI decida qué hacer
        // (Por ejemplo: eliminar de la lista si es DELETE, o agregar si es INSERT)
        callback(payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("✅ Sincronización automática activada.");
      }
    });

  // Retorna función para desconectar cuando cierres la ventana
  return () => {
    supabase.removeChannel(channel);
  }
}
