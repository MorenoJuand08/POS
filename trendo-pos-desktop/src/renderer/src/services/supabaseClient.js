import { createClient } from '@supabase/supabase-js'

// Fallback directo con tus credenciales, por si Vite no carga .env
const FALLBACK_SUPABASE_URL = 'https://fyoeagmtnbgtosyobgmz.supabase.co'
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5b2VhZ210bmJndG9zeW9iZ216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzYzODgsImV4cCI6MjA3NjcxMjM4OH0.sVzAxI3TxxJD0Dak-2O5MyM89GM8MZw08CwyXtPJGu0'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  FALLBACK_SUPABASE_KEY

const USE_LOCAL_ONLY = import.meta.env.VITE_USE_LOCAL_ONLY === 'true'
const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

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
  if (!HAS_SUPABASE_CONFIG) {
    console.warn('⚠️ Supabase no configurado (faltan VITE_SUPABASE_URL o clave). Usando modo local.')
    return false
  }
  return true
}

// Cliente dummy si estamos en modo local
export const supabase = !HAS_SUPABASE_CONFIG || USE_LOCAL_ONLY
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