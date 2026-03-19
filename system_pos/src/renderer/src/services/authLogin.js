import { supabase } from './supabaseClient'

// --- CONSTANTES ---
const STORAGE_KEY = 'mock_credentials'
const RECOVERY_TOKENS_KEY = 'recovery_tokens'
const DEFAULT_ROLE = 'Cajero'
const VALID_ROLES = ['Administrador', 'Cajero']
const USE_LOCAL_ONLY = import.meta.env.VITE_USE_LOCAL_ONLY === 'true'
const FORCE_LOCAL_MODE = false  // 🔓 MODO LOCAL FORZADO DESACTIVADO (usar Supabase si está disponible)
const RECOVERY_TOKEN_EXPIRY = 30 * 60 * 1000 // 30 minutos

// --- AYUDANTES ---
function hasSupabaseAuth() {
  // 🔓 Forzar modo local siempre
  if (FORCE_LOCAL_MODE || USE_LOCAL_ONLY) return false
  return Boolean(supabase && supabase.auth && typeof supabase.auth.signInWithPassword === 'function')
}

function normalizeTypeEmployee(role) {
  if (VALID_ROLES.includes(role)) return role
  return DEFAULT_ROLE
}

// --- STORE LOCAL (MOCK / OFFLINE) ---
function getStore() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function setStore(store) {
  if (typeof window === 'undefined') {
    throw new Error('localStorage no disponible (server-side)')
  }
  try { 
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (err) {
    console.error('❌ Error guardando en localStorage:', err)
    throw new Error('No se pudo guardar en localStorage: ' + err.message)
  }
}

function persistMockSession(user) {
  if (typeof window === 'undefined') {
    throw new Error('localStorage no disponible (server-side)')
  }
  try { 
    window.localStorage.setItem('mock_user', JSON.stringify(user)) 
  } catch (err) {
    console.error('❌ Error guardando sesión:', err)
    throw new Error('No se pudo guardar sesión: ' + err.message)
  }
}

// --- FUNCIONES PARA RECUPERACIÓN DE CONTRASEÑA (LOCAL) ---
function generateRecoveryToken() {
  // Generar un token aleatorio de 32 caracteres
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function getRecoveryTokens() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(RECOVERY_TOKENS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function setRecoveryTokens(tokens) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(RECOVERY_TOKENS_KEY, JSON.stringify(tokens)) } catch {}
}

function createRecoveryToken(email) {
  const tokens = getRecoveryTokens()
  const token = generateRecoveryToken()
  const expiresAt = Date.now() + RECOVERY_TOKEN_EXPIRY
  
  tokens[email] = { token, expiresAt }
  setRecoveryTokens(tokens)
  
  return token
}

function validateRecoveryToken(email, token) {
  const tokens = getRecoveryTokens()
  const record = tokens[email]
  
  if (!record) return { valid: false, message: 'No hay solicitud de recuperación activa' }
  if (record.token !== token) return { valid: false, message: 'Token inválido' }
  if (Date.now() > record.expiresAt) {
    delete tokens[email]
    setRecoveryTokens(tokens)
    return { valid: false, message: 'Token expirado (30 minutos)' }
  }
  
  return { valid: true }
}

function clearRecoveryToken(email) {
  const tokens = getRecoveryTokens()
  delete tokens[email]
  setRecoveryTokens(tokens)
}

// ==========================================
// 1. FUNCIÓN DE INICIO DE SESIÓN (LOGIN)
// ==========================================
export async function loginWithEmail(email, password) {
  // Liberar el hilo para que React pueda renderizar
  await Promise.resolve()
  
  const trimmedEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(password || '')

  if (!trimmedEmail || !safePassword) {
    throw new Error('Correo y contraseña requeridos')
  }

  // --- MODO ONLINE (SUPABASE) ---
  if (hasSupabaseAuth()) {
    // A. Intentar loguear con Auth
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: trimmedEmail, 
      password: safePassword 
    })

    if (error) {
      // Manejo específico para cuando falta confirmar correo
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Debes confirmar tu correo electrónico antes de iniciar sesión.")
      }
      // Mensaje amigable cuando las credenciales son inválidas
      if (error.message.includes('Invalid login credentials')) {
        if (import.meta.env.DEV) {
          console.log('Inicio de sesión incorrecto')
        }
        throw new Error('Correo o contraseña incorrectos')
      }
      throw error
    }

    // B. Recuperar datos del empleado desde el esquema 'public'
    const rawUser = data?.user
    let typeEmployee = normalizeTypeEmployee(rawUser?.user_metadata?.type_employee)
    let employeeData = null

    try {
      // Consultamos la tabla real en tu esquema personalizado
      const { data: dbDataArray, error: dbError } = await supabase
        .schema('public')
        .from('employee')
        .select('type_employee, first_name, last_name, second_name, second_last_name')
        .eq('auth_user_id', rawUser.id)
        
      if (dbError) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ No se pudo leer tabla employee (Supabase):', dbError?.message || dbError)
        }
      } else if (dbDataArray && dbDataArray.length > 0) {
        employeeData = dbDataArray[0]
        typeEmployee = normalizeTypeEmployee(dbDataArray[0].type_employee)
        if (import.meta.env.DEV) {
          console.log('✓ Datos de empleado obtenidos:', employeeData)
        }
      } else if (import.meta.env.DEV) {
        console.log('ℹ️ No hay registro en tabla employee para este usuario (se creará al sincronizar)')
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Error de red al consultar employee (usando solo metadata de usuario):', err?.message || err)
      }
    }
    // C. Construir objeto de usuario unificado
    const user = {
      ...(rawUser || {}),
      email: rawUser?.email || trimmedEmail,
      type_employee: typeEmployee,
      first_name: employeeData?.first_name || rawUser?.user_metadata?.first_name || '',
      second_name: employeeData?.second_name || rawUser?.user_metadata?.second_name || '',
      last_name: employeeData?.last_name || rawUser?.user_metadata?.last_name || '',
      second_last_name: employeeData?.second_last_name || rawUser?.user_metadata?.second_last_name || ''
    }

    persistMockSession(user)
    return user
  }

  // --- MODO OFFLINE (FALLBACK LOCAL) ---
  // Liberar hilo nuevamente antes de operaciones de localStorage
  await Promise.resolve()
  
  const store = getStore()
  const entry = store[trimmedEmail]
  if (!entry) throw new Error('Usuario no encontrado. Regístrate primero.')
  if (entry.password !== safePassword) throw new Error('Contraseña incorrecta')
  
  const user = {
    email: trimmedEmail,
    type_employee: normalizeTypeEmployee(entry.type_employee),
    first_name: entry.first_name || '',
    last_name: entry.last_name || ''
  }
  persistMockSession(user)
  return user
}

// ==========================================
// 2. FUNCIÓN DE REGISTRO (CORREGIDA Y ROBUSTA)
// ==========================================
export async function registerWithEmail(email, password, roleInput, names, extraData) {
  // Liberar el hilo para que React pueda renderizar
  await Promise.resolve()
  
  const trimmedEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(password || '')
  const typeEmployee = normalizeTypeEmployee(roleInput)
  
  const person = {
    firstName: (names?.firstName || '').trim(),
    secondName: (names?.secondName || '').trim(),
    lastName: (names?.lastName || '').trim(),
    secondLastName: (names?.secondLastName || '').trim()
  }

  // --- VALIDACIONES ---
  if (!trimmedEmail || !safePassword) throw new Error('Datos incompletos')
  if (!person.firstName || !person.lastName) throw new Error('Nombre y Apellido requeridos')
  
  // ROBUSTEZ: Buscamos el documento en extraData O dentro de 'names' (por si hubo confusión al enviar)
  const docValue = extraData?.document || names?.document || names?.em_document
  const phoneValue = extraData?.phone || names?.phone

  // En modo local, el documento no es obligatorio para permitir registro de prueba
  // if (!docValue) throw new Error('La Cédula/Documento es obligatoria')

  // --- MODO ONLINE (SUPABASE) ---
  if (hasSupabaseAuth()) {
    
    // Blindaje 1: Limpiar sesión previa
    await supabase.auth.signOut()

    // Validación previa: si tenemos documento, verificar si ya existe en tabla employee
    if (docValue) {
      try {
        const { data: existingEmployees, error: employeeCheckError } = await supabase
          .schema('public')
          .from('employee')
          .select('em_document')
          .eq('em_document', String(docValue).trim())
          .limit(1)

        if (employeeCheckError) {
          console.warn('⚠️ No se pudo verificar documento en employee antes del registro:', employeeCheckError)
        } else if (existingEmployees && existingEmployees.length > 0) {
          throw new Error('Ya existe un empleado registrado con este documento. Usa "Iniciar sesión" o cambia el documento.')
        }
      } catch (checkErr) {
        // Si es un error de validación nuestro, relanzarlo; si es otro, solo loguear
        if (checkErr?.message && checkErr.message.includes('Ya existe un empleado registrado')) {
          throw checkErr
        }
        console.warn('⚠️ Error realizando validación previa de empleado (continuando con registro):', checkErr)
      }
    }

    // 1. Crear usuario con Metadata completa
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: safePassword,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        data: {
          // Datos básicos
          type_employee: typeEmployee,
          first_name: person.firstName,
          second_name: person.secondName,
          last_name: person.lastName,
          second_last_name: person.secondLastName,
          
          // --- NUEVOS DATOS PARA EL TRIGGER SQL ---
          em_document: docValue || '', 
          phone: phoneValue || ''
        }
      }
    })

    if (error) {
      const normalizedMessage = String(error.message || '').toLowerCase()

      // Error típico cuando el trigger intenta insertar un empleado con PK duplicada (SQLSTATE 23505)
      if (error.code === '23505' || normalizedMessage.includes('duplicate key value') || normalizedMessage.includes('already exists')) {
        throw new Error('Ya existe un usuario o empleado con estos datos. Intenta iniciar sesión o usa otro correo/documento.')
      }

      // Mensaje genérico de Supabase para errores del trigger/BD
      if (normalizedMessage.includes('database error saving new user')) {
        throw new Error('Error interno al crear el usuario en la base de datos. Inténtalo de nuevo más tarde o revisa la configuración de Supabase.')
      }

      // Cualquier otro error se propaga tal cual para depuración
      throw error
    }

    // Blindaje 2: Cerrar sesión inmediatamente si se abrió
    // Esto previene entrar al software sin verificar email
    if (data.session) {
        await supabase.auth.signOut() 
    }

    return { 
        success: true, 
        requiresLogin: true, 
        isLocal: false,
        message: "Registro exitoso. Revisa tu correo para confirmar la cuenta antes de ingresar." 
    }
  }

  // --- MODO OFFLINE (FALLBACK LOCAL) ---
  // Liberar hilo nuevamente antes de operaciones de localStorage
  await Promise.resolve()
  
  try {
    const store = getStore()
    if (store[trimmedEmail]) throw new Error('El usuario ya existe')
    
    console.log('💾 Guardando credenciales locales para:', trimmedEmail)
    store[trimmedEmail] = {
      password: safePassword,
      type_employee: typeEmployee,
      first_name: person.firstName,
      second_name: person.secondName,
      last_name: person.lastName,
      second_last_name: person.secondLastName,
      em_document: docValue || '',
      phone: phoneValue || ''
    }
    
    console.log('💾 Llamando a setStore()...')
    setStore(store)
    console.log('✅ Credenciales guardadas en localStorage')
    
    // Liberar hilo antes de persistir sesión
    await Promise.resolve()
    
    const user = { 
      email: trimmedEmail, 
      type_employee: typeEmployee, 
      first_name: person.firstName,
      second_name: person.secondName,
      last_name: person.lastName,
      second_last_name: person.secondLastName
    }
    
    console.log('💾 Persistiendo sesión...')
    persistMockSession(user)
    console.log('✅ Sesión persistida')
    
    return { 
      success: true, 
      requiresLogin: false, 
      isLocal: true,
      message: "Registro exitoso en modo local. Puedes iniciar sesión ahora.",
      user: user
    }
  } catch (err) {
    console.error('❌ Error en registro offline:', err)
    throw new Error(err?.message || 'Error al guardar nuevo usuario')
  }
}

export { VALID_ROLES }

// ==========================================
// 3. ENVIAR RECUPERACIÓN DE CONTRASEÑA
// ==========================================
export async function sendPasswordRecovery(email) {
  // Liberar el hilo para que React pueda renderizar
  await Promise.resolve()
  
  const trimmedEmail = String(email || '').trim().toLowerCase()
  if (!trimmedEmail) throw new Error('Correo electrónico requerido')

  // --- MODO ONLINE (SUPABASE) ---
  if (hasSupabaseAuth()) {
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
      const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo })

      if (error) {
        const msg = String(error.message || '').toLowerCase()

        // Mensaje más claro cuando el usuario no existe en Supabase
        if (msg.includes('user not found')) {
          throw new Error('No existe ninguna cuenta registrada con este correo.')
        }

        throw error
      }

      // Respuesta estándar: no confirmamos si el correo existe por seguridad
      return {
        success: true,
        isLocal: false,
        message: 'Si existe una cuenta con este correo, te hemos enviado un enlace para cambiar tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.'
      }
    } catch (err) {
      console.error('❌ Error enviando correo de recuperación (Supabase):', err)
      throw new Error(err?.message || 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo más tarde.')
    }
  }

  // --- MODO OFFLINE (FALLBACK LOCAL) ---
  console.log('🔐 Recuperación de contraseña en modo LOCAL')
  
  // Liberar hilo antes de acceder a localStorage
  await Promise.resolve()
  
  // Modo offline: generar token local para recuperación
  const store = getStore()
  if (!store[trimmedEmail]) {
    throw new Error('Usuario no encontrado en el sistema local para recuperación offline.')
  }
  
  const token = createRecoveryToken(trimmedEmail)
  
  console.log('✅ Token de recuperación generado (local):', token)
  
  return { 
    success: true, 
    message: `✅ Token generado: ${token}\n\n📋 Copia este token, ingresa tu correo y nueva contraseña en la siguiente pantalla.\n\n⏰ El token expira en 30 minutos.`,
    isLocal: true,
    token: token,
    email: trimmedEmail
  }
}

// ==========================================
// 4. CAMBIAR CONTRASEÑA CON TOKEN
// ==========================================
export async function resetPasswordWithToken(email, token, newPassword) {
  // Liberar el hilo para que React pueda renderizar
  await Promise.resolve()
  
  const trimmedEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(newPassword || '')

  if (!trimmedEmail || !safePassword || !token) {
    throw new Error('Datos incompletos: correo, token y contraseña requeridos')
  }

  if (safePassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres')
  }

  // 🔓 SIEMPRE usar modo local (FORCE_LOCAL_MODE está activo)
  console.log('🔐 Cambio de contraseña en modo LOCAL')
  console.log('📧 Email:', trimmedEmail)
  console.log('🔑 Token:', token)
  
  // Liberar hilo antes de acceder a localStorage
  await Promise.resolve()
  
  // Modo offline: validar token y cambiar contraseña local
  const validation = validateRecoveryToken(trimmedEmail, token)
  if (!validation.valid) {
    console.error('❌ Token inválido o expirado:', validation.message)
    throw new Error(validation.message)
  }

  const store = getStore()
  if (!store[trimmedEmail]) {
    throw new Error('Usuario no encontrado en el sistema local')
  }

  console.log('🔑 Actualizando contraseña para:', trimmedEmail)
  store[trimmedEmail].password = safePassword
  setStore(store)
  
  clearRecoveryToken(trimmedEmail)
  
  console.log('✅ Contraseña actualizada exitosamente')

  return { 
    success: true, 
    message: '✅ Contraseña actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
    isLocal: true
  }
}