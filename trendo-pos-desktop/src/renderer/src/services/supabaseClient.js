import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
const USE_LOCAL_ONLY = import.meta.env.VITE_USE_LOCAL_ONLY === 'true'

const LOCAL_MODE_ERROR = { message: 'Modo local: Supabase desactivado' }

const createLocalQueryBuilder = () => {
  const builder = {
    select: async () => ({ data: null, error: LOCAL_MODE_ERROR }),
    insert: () => builder,
    upsert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    in: () => builder,
    ilike: () => builder,
    order: () => builder,
    range: () => builder,
    limit: () => builder,
    single: async () => ({ data: null, error: LOCAL_MODE_ERROR }),
    maybeSingle: async () => ({ data: null, error: LOCAL_MODE_ERROR })
  }
  return builder
}

const createLocalSupabaseStub = () => ({
  __mock: true,
  from: () => createLocalQueryBuilder(),
  schema: () => ({ from: () => createLocalQueryBuilder() })
})

export const isSupabaseAvailable = () => {
  if (USE_LOCAL_ONLY) {
    console.log('📱 Modo LOCAL activado - Sin sincronización con Supabase')
    return false
  }
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)
}

// Cliente dummy si estamos en modo local
export const supabase = USE_LOCAL_ONLY
  ? createLocalSupabaseStub()
  : createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    })