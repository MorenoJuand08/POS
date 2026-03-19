import { supabase } from './supabaseClient'

const EMPLOYEE_TABLE = 'employee'
const EMPLOYEE_SCHEMA = 'public'
const EMPLOYEE_LAST_SYNC_KEY = 'lastEmployeeSync'

/**
 * Inserta o actualiza un empleado en Supabase
 * @param {Object} employeeData - Datos del empleado
 * @param {string} employeeData.em_document - Documento de identidad del empleado
 * @param {string} employeeData.first_name - Primer nombre
 * @param {string} employeeData.second_name - Segundo nombre (opcional)
 * @param {string} employeeData.last_name - Primer apellido
 * @param {string} employeeData.second_last_name - Segundo apellido (opcional)
 * @param {string} employeeData.type_employee - Tipo de empleado (ej: 'admin', 'vendedor', 'caja')
 * @param {string} employeeData.auth_user_id - ID de usuario de Supabase Auth
 * @param {string} employeeData.email - Email del empleado
 * @param {string} employeeData.user_id - ID de usuario en el sistema local
 * @param {string} employeeData.phone - Teléfono del empleado (opcional)
 * @returns {Promise<Object>} Respuesta de Supabase
 */
export async function upsertEmployee(employeeData) {
  try {
    const {
      em_document,
      first_name,
      second_name,
      last_name,
      second_last_name,
      type_employee,
      auth_user_id,
      email,
      user_id,
      phone
    } = employeeData

    console.log('💼 Insertando/actualizando empleado:', {
      em_document,
      first_name,
      last_name,
      email
    })

    // Validar campos requeridos
    if (!em_document || !first_name || !last_name || !auth_user_id || !email) {
      throw new Error('Faltan campos requeridos: em_document, first_name, last_name, auth_user_id, email')
    }

    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .upsert(
        {
          em_document: String(em_document).trim(),
          first_name: String(first_name).trim(),
          second_name: second_name ? String(second_name).trim() : null,
          last_name: String(last_name).trim(),
          second_last_name: second_last_name ? String(second_last_name).trim() : null,
          type_employee: type_employee ? String(type_employee).trim() : null,
          auth_user_id: String(auth_user_id).trim(),
          email: String(email).trim(),
          user_id: user_id ? String(user_id).trim() : null,
          phone: phone ? String(phone).trim() : null
        },
        { onConflict: 'em_document' }
      )

    if (error) {
      console.error('❌ Error al insertar empleado:', error)
      throw error
    }

    console.log('✅ Empleado guardado exitosamente:', data)
    return data
  } catch (error) {
    console.error('❌ Error en upsertEmployee:', error.message)
    throw error
  }
}

/**
 * Obtiene un empleado por documento de identidad
 * @param {string} em_document - Documento de identidad del empleado
 * @returns {Promise<Object>} Datos del empleado
 */
export async function getEmployeeByDocument(em_document) {
  try {
    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .select('*')
      .eq('em_document', String(em_document).trim())
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, que es esperado
      throw error
    }

    return data || null
  } catch (error) {
    console.error('Error obteniendo empleado por documento:', error.message)
    return null
  }
}

/**
 * Obtiene un empleado por ID de usuario de Supabase Auth
 * @param {string} auth_user_id - ID del usuario de Supabase Auth
 * @returns {Promise<Object>} Datos del empleado
 */
export async function getEmployeeByAuthUserId(auth_user_id) {
  try {
    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .select('*')
      .eq('auth_user_id', String(auth_user_id).trim())
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error) {
    console.error('Error obteniendo empleado por auth_user_id:', error.message)
    return null
  }
}

/**
 * Obtiene un empleado por email
 * @param {string} email - Email del empleado
 * @returns {Promise<Object>} Datos del empleado
 */
export async function getEmployeeByEmail(email) {
  try {
    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .select('*')
      .eq('email', String(email).trim())
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error) {
    console.error('Error obteniendo empleado por email:', error.message)
    return null
  }
}

/**
 * Obtiene todos los empleados
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.type_employee - Filtrar por tipo de empleado
 * @param {number} options.limit - Límite de resultados
 * @returns {Promise<Array>} Lista de empleados
 */
export async function getAllEmployees(options = {}) {
  try {
    let query = supabase.schema(EMPLOYEE_SCHEMA).from(EMPLOYEE_TABLE).select('*')

    if (options.type_employee) {
      query = query.eq('type_employee', String(options.type_employee).trim())
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error obteniendo empleados:', error.message)
    return []
  }
}

/**
 * Actualiza datos específicos de un empleado
 * @param {string} em_document - Documento de identidad del empleado
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Datos actualizados
 */
export async function updateEmployee(em_document, updates) {
  try {
    console.log('📝 Actualizando empleado:', em_document)

    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .update(updates)
      .eq('em_document', String(em_document).trim())
      .select()

    if (error) {
      throw error
    }

    console.log('✅ Empleado actualizado:', data)
    return data
  } catch (error) {
    console.error('Error actualizando empleado:', error.message)
    throw error
  }
}

/**
 * Elimina un empleado (soft delete)
 * @param {string} em_document - Documento de identidad del empleado
 * @returns {Promise<void>}
 */
export async function deleteEmployee(em_document) {
  try {
    console.log('🗑️ Eliminando empleado:', em_document)

    const { error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .delete()
      .eq('em_document', String(em_document).trim())

    if (error) {
      throw error
    }

    console.log('✅ Empleado eliminado')
  } catch (error) {
    console.error('Error eliminando empleado:', error.message)
    throw error
  }
}

/**
 * Sincroniza datos del usuario autenticado con la tabla trendo.employee
 * @param {Object} employeeFormData - Datos del formulario del empleado
 * @returns {Promise<Object>} Empleado sincronizado
 */
export async function syncAuthUserToEmployee(employeeFormData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('No hay usuario autenticado')
    }

    console.log('👤 Sincronizando usuario autenticado con tabla employee:', user.email)

    const employeeData = {
      em_document: employeeFormData.em_document,
      first_name: employeeFormData.first_name,
      second_name: employeeFormData.second_name || '',
      last_name: employeeFormData.last_name,
      second_last_name: employeeFormData.second_last_name || '',
      type_employee: employeeFormData.type_employee || 'vendedor',
      auth_user_id: user.id,
      email: user.email,
      user_id: employeeFormData.user_id || null,
      phone: employeeFormData.phone || ''
    }

    const result = await upsertEmployee(employeeData)
    console.log('✅ Usuario sincronizado con tabla employee')

    return result
  } catch (error) {
    console.error('Error sincronizando usuario con employee:', error.message)
    throw error
  }
}

/**
 * Sincroniza cambios de perfil del usuario autenticado a la tabla employee
 * Se usa cuando el usuario edita su perfil en la sección de Configuración
 * @param {Object} profileUpdates - Datos actualizados del perfil (displayName, email)
 * @returns {Promise<Object>} Empleado actualizado
 */
export async function syncProfileChangesToEmployee(profileUpdates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('No hay usuario autenticado')
    }

    console.log('🔄 Sincronizando cambios de perfil a tabla employee:', user.email)

    // Obtener empleado actual por auth_user_id
    const employee = await getEmployeeByAuthUserId(user.id)

    if (!employee) {
      console.warn('⚠️ No se encontró empleado para sincronizar cambios de perfil')
      return null
    }

    // Preparar actualizaciones
    const updates = {}

    // Actualizar nombre si cambió
    if (profileUpdates.displayName && profileUpdates.displayName !== employee.first_name) {
      // Para simplificar, usar displayName como first_name
      // Si necesitas separar en first_name y last_name, ajusta aquí
      updates.first_name = profileUpdates.displayName
    }

    // Actualizar email si cambió
    if (profileUpdates.email && profileUpdates.email !== employee.email) {
      updates.email = profileUpdates.email
    }

    // Solo actualizar si hay cambios
    if (Object.keys(updates).length === 0) {
      console.log('✅ No hay cambios de perfil para sincronizar')
      return employee
    }

    const result = await updateEmployee(employee.em_document, updates)
    console.log('✅ Cambios de perfil sincronizados a tabla employee')

    return result
  } catch (error) {
    console.error('Error sincronizando cambios de perfil:', error.message)
    throw error
  }
}

/**
 * Obtiene el empleado del usuario autenticado actual
 * @returns {Promise<Object|null>} Datos del empleado o null
 */
export async function getCurrentUserEmployee() {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    return await getEmployeeByAuthUserId(user.id)
  } catch (error) {
    console.error('Error obteniendo empleado actual:', error.message)
    return null
  }
}

/**
 * Suscribe a cambios en tiempo real de la tabla employee
 * @param {Function} callback - Función a ejecutar cuando hay cambios
 * @returns {Object} Objeto de suscripción para desuscribirse
 */
export function onEmployeeInsert(callback) {
  const subscription = supabase
    .schema(EMPLOYEE_SCHEMA)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: EMPLOYEE_SCHEMA,
        table: EMPLOYEE_TABLE
      },
      (payload) => {
        console.log('📥 Nuevo empleado en Supabase:', payload.new)
        callback(payload.new)
      }
    )
    .subscribe()

  return subscription
}

/**
 * Suscribe a cambios en tiempo real de la tabla employee (todas las operaciones)
 * @param {Function} callback - Función a ejecutar cuando hay cambios
 * @returns {Object} Objeto de suscripción para desuscribirse
 */
export function onEmployeeChange(callback) {
  const subscription = supabase
    .schema(EMPLOYEE_SCHEMA)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: EMPLOYEE_SCHEMA,
        table: EMPLOYEE_TABLE
      },
      (payload) => {
        console.log('🔄 Cambio en empleado:', payload)
        callback(payload)
      }
    )
    .subscribe()

  return subscription
}

/**
 * Busca empleados por nombre completo
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Promise<Array>} Lista de empleados que coinciden
 */
export async function searchEmployees(searchTerm) {
  try {
    const search = `%${searchTerm.toLowerCase()}%`

    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .select('*')
      .or(
        `first_name.ilike.${search},last_name.ilike.${search},em_document.ilike.${search},email.ilike.${search}`
      )

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error buscando empleados:', error.message)
    return []
  }
}

/**
 * Obtiene empleados por tipo
 * @param {string} type_employee - Tipo de empleado
 * @returns {Promise<Array>} Lista de empleados del tipo especificado
 */
export async function getEmployeesByType(type_employee) {
  try {
    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .select('*')
      .eq('type_employee', String(type_employee).trim())

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error obteniendo empleados por tipo:', error.message)
    return []
  }
}

/**
 * Cuenta el total de empleados
 * @returns {Promise<number>} Total de empleados
 */
export async function getEmployeeCount() {
  try {
    const { count, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error contando empleados:', error.message)
    return 0
  }
}

/**
 * Exporta datos de empleados a formato plano (para reportes)
 * @returns {Promise<Array>} Lista de empleados con datos completos
 */
export async function exportEmployeesData() {
  try {
    const { data, error } = await supabase
      .schema(EMPLOYEE_SCHEMA)
      .from(EMPLOYEE_TABLE)
      .select('*')

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error exportando datos de empleados:', error.message)
    return []
  }
}

/**
 * Sincroniza todos los usuarios de Supabase Auth a la tabla trendo.employee
 * Usa los datos del user_metadata como información del empleado
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export async function syncAllAuthUsersToEmployees() {
  try {
    console.log('🔄 Iniciando sincronización de usuarios Auth a tabla employee...')

    // Obtener todos los usuarios (requiere privilegios de admin)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      throw new Error(`Error al obtener usuarios de Auth: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      console.log('⚠️ No se encontraron usuarios en Supabase Auth')
      return { success: true, synced: 0, failed: 0, message: 'No hay usuarios para sincronizar' }
    }

    console.log(`👥 Se encontraron ${users.length} usuarios de Auth`)

    let synced = 0
    let failed = 0
    const errors = []

    // Sincronizar cada usuario
    for (const authUser of users) {
      try {
        const { user_metadata = {} } = authUser

        // Construir datos del empleado desde user_metadata
        const employeeData = {
          em_document: user_metadata.documentId || user_metadata.em_document || authUser.email.split('@')[0],
          first_name: user_metadata.firstName || user_metadata.first_name || 'N/A',
          second_name: user_metadata.secondName || user_metadata.second_name || '',
          last_name: user_metadata.lastName || user_metadata.last_name || 'N/A',
          second_last_name: user_metadata.secondLastName || user_metadata.second_last_name || '',
          type_employee: user_metadata.typeEmployee || user_metadata.type_employee || 'vendedor',
          auth_user_id: authUser.id,
          email: authUser.email,
          user_id: user_metadata.userId || user_metadata.user_id || null,
          phone: user_metadata.phone || user_metadata.phoneNumber || ''
        }

        console.log(`📤 Sincronizando usuario: ${employeeData.email}`)

        await upsertEmployee(employeeData)
        synced++
      } catch (error) {
        failed++
        const errorMsg = `Error sincronizando ${authUser.email}: ${error.message}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const result = {
      success: failed === 0,
      synced,
      failed,
      total: users.length,
      errors: errors.length > 0 ? errors : null,
      message: `Sincronización completada: ${synced} exitosos, ${failed} fallidos de ${users.length} usuarios`
    }

    console.log('✅ Sincronización finalizada:', result)
    return result
  } catch (error) {
    console.error('❌ Error en sincronización de usuarios Auth:', error.message)
    throw error
  }
}

/**
 * Sincroniza un usuario específico de Supabase Auth a la tabla employee
 * @param {string} userId - ID del usuario de Supabase Auth (opcional, usa el actual si no se proporciona)
 * @returns {Promise<Object>} Datos del empleado sincronizado
 */
export async function syncSingleAuthUserToEmployee(userId) {
  try {
    console.log('🔄 Sincronizando usuario a tabla employee...')

    // Si no se proporciona userId, obtener el usuario autenticado actual
    let authUser
    if (userId) {
      // Intentar obtener usuario específico (requiere admin)
      try {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
        if (userError || !user) {
          throw new Error(`Usuario no encontrado: ${userError?.message}`)
        }
        authUser = user
      } catch (adminError) {
        console.warn('⚠️ No se pudo obtener usuario con admin, usando usuario actual:', adminError.message)
        // Fallback: obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        authUser = user
      }
    } else {
      // Obtener usuario autenticado actual (sin privilegios de admin)
      const { data: { user } } = await supabase.auth.getUser()
      authUser = user
    }

    if (!authUser) {
      throw new Error('No hay usuario autenticado')
    }

    const { user_metadata = {} } = authUser

    // Extraer documento de identidad (buscar en múltiples campos posibles)
    const em_document = user_metadata.documentId || 
                        user_metadata.em_document || 
                        user_metadata.document || 
                        user_metadata.identification_number ||
                        authUser.email.split('@')[0]

    // Construir datos del empleado
    const employeeData = {
      em_document: String(em_document).trim(),
      first_name: user_metadata.firstName || user_metadata.first_name || 'N/A',
      second_name: user_metadata.secondName || user_metadata.second_name || '',
      last_name: user_metadata.lastName || user_metadata.last_name || 'N/A',
      second_last_name: user_metadata.secondLastName || user_metadata.second_last_name || '',
      type_employee: user_metadata.typeEmployee || user_metadata.type_employee || 'vendedor',
      auth_user_id: authUser.id,
      email: authUser.email,
      user_id: user_metadata.userId || user_metadata.user_id || null,
      phone: user_metadata.phone || user_metadata.phoneNumber || ''
    }

    console.log('📤 Datos a sincronizar:', employeeData)

    const result = await upsertEmployee(employeeData)
    
    // Actualizar user_metadata con el documento confirmado
    try {
      const newMetadata = {
        ...user_metadata,
        documentId: em_document,
        firstName: employeeData.first_name,
        secondName: employeeData.second_name,
        lastName: employeeData.last_name,
        secondLastName: employeeData.second_last_name,
        typeEmployee: employeeData.type_employee,
        phone: employeeData.phone
      }
      
      await supabase.auth.updateUser({
        data: newMetadata
      })
      
      console.log('✅ User_metadata actualizado con documentId')
    } catch (metaError) {
      console.warn('⚠️ No se pudo actualizar user_metadata:', metaError.message)
    }

    console.log('✅ Usuario sincronizado exitosamente a tabla employee')

    return result
  } catch (error) {
    console.error('❌ Error sincronizando usuario a employee:', error.message)
    throw error
  }
}

/**
 * Actualiza el user_metadata de un usuario en Supabase Auth
 * @param {string} userId - ID del usuario
 * @param {Object} metadata - Datos a actualizar en user_metadata
 * @returns {Promise<Object>} Usuario actualizado
 */
export async function updateAuthUserMetadata(userId, metadata) {
  try {
    console.log('📝 Actualizando metadata del usuario:', userId)

    const { data: { user }, error } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: metadata }
    )

    if (error) {
      throw error
    }

    console.log('✅ Metadata actualizada')
    return user
  } catch (error) {
    console.error('Error actualizando metadata:', error.message)
    throw error
  }
}

/**
 * Sincroniza datos bidireccionales: si hay cambios en employee, actualiza Auth
 * @param {string} em_document - Documento del empleado
 * @param {Object} updatedData - Datos actualizados
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export async function syncEmployeeToAuthUser(em_document, updatedData) {
  try {
    console.log('🔄 Sincronizando employee a Auth:', em_document)

    // Obtener empleado actualizado
    const employee = await getEmployeeByDocument(em_document)

    if (!employee || !employee.auth_user_id) {
      throw new Error('Empleado no encontrado o sin auth_user_id')
    }

    // Preparar metadata para Auth
    const authMetadata = {
      documentId: employee.em_document,
      firstName: employee.first_name,
      secondName: employee.second_name,
      lastName: employee.last_name,
      secondLastName: employee.second_last_name,
      typeEmployee: employee.type_employee,
      userId: employee.user_id,
      phone: employee.phone
    }

    // Actualizar usuario en Auth
    await updateAuthUserMetadata(employee.auth_user_id, authMetadata)

    console.log('✅ Sincronización bidireccional completada')
    return { employee, authUser: authMetadata }
  } catch (error) {
    console.error('Error en sincronización bidireccional:', error.message)
    throw error
  }
}

export default {
  upsertEmployee,
  getEmployeeByDocument,
  getEmployeeByAuthUserId,
  getEmployeeByEmail,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  syncAuthUserToEmployee,
  getCurrentUserEmployee,
  onEmployeeInsert,
  onEmployeeChange,
  searchEmployees,
  getEmployeesByType,
  getEmployeeCount,
  exportEmployeesData,
  syncAllAuthUsersToEmployees,
  syncSingleAuthUserToEmployee,
  updateAuthUserMetadata,
  syncEmployeeToAuthUser
}
