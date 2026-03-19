import { useEffect, useState, useMemo } from 'react'
import { getMeta, setMeta, findItemByCode, adjustStockByItem, addSale, getActiveShift, addBill } from '@/services/db'
import { formatCOP, formatCOPInput, parseCOP } from '@/lib/currency'
import { syncAll } from '@/services/sync'
import { supabase } from '@/services/supabaseClient'

// Pantalla de cobro final: métodos de pago, desglose y generación de factura
export default function Payment({ onBack, onNavigate, onLogout }) {
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Métodos de pago (multi-entrada)
  const [efectivo, setEfectivo] = useState('')
  const [transferencia, setTransferencia] = useState('')
  
  // Pago con Tarjeta
  const [tarjetaTipo, setTarjetaTipo] = useState('credito') // 'credito' o 'debito'
  const [tarjetaVoucher, setTarjetaVoucher] = useState('')
  const [tarjetaValor, setTarjetaValor] = useState('')
  
  // Otros Pagos
  const [otroPagoTipo, setOtroPagoTipo] = useState('addi') // 'addi' o 'sistecredito'
  const [otroPagoValor, setOtroPagoValor] = useState('')
  
  const [descuentoPct, setDescuentoPct] = useState('') // porcentaje 0-100
  const [customerDocument, setCustomerDocument] = useState('') // Documento del cliente
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    // Cargar venta pendiente
    async function load() {
      try {
        const p = await getMeta('pending_sale', null)
        setPending(p)
        console.log('📥 pending_sale cargado:', {
          tiene_customer_id: !!p?.customer?.customer_id,
          valor_customer_id: p?.customer?.customer_id,
          tiene_customerId: !!p?.customerId,
          valor_customerId: p?.customerId
        })
        
        // Obtener el documento del cliente desde:
        // 1. DevolucionesCaja: p?.customer?.customer_id
        // 2. Cash: p?.customerId
        if (p?.customer?.customer_id) {
          console.log('🎯 Usando customer_id de DevolucionesCaja:', p.customer.customer_id)
          setCustomerDocument(p.customer.customer_id)
        } else if (p?.customerId) {
          console.log('🎯 Usando customerId de Cash.jsx:', p.customerId)
          setCustomerDocument(p.customerId)
        } else {
          console.warn('⚠️ No se encontró customer_id o customerId en pending_sale')
        }
        setLoading(false)
      } catch {
        setError('No se pudo cargar venta pendiente')
        setLoading(false)
      }
    }
    load()
  }, [])

  // Cálculo de totales - El precio mostrado en el carrito es el total a cobrar
  // Por defecto NO hay descuento. Los descuentos son opcionales.
  const subtotal = useMemo(() => (pending?.cart||[]).reduce((acc, l) => acc + (Number(l.price)||0) * (parseInt(l.qty)||0), 0), [pending])
  
  const descuentoPercent = useMemo(() => {
    const raw = descuentoPct.trim()
    if (!raw) return 0
    const num = parseFloat(raw.replace(/,/g,'').replace('%',''))
    if (!isFinite(num) || num < 0) return 0
    return Math.min(num, 100)
  }, [descuentoPct])
  
  const descuentoVal = useMemo(() => subtotal * (descuentoPercent / 100), [subtotal, descuentoPercent])
  const subtotalConDescuento = useMemo(() => Math.max(0, subtotal - descuentoVal), [subtotal, descuentoVal])
  
  // Si hay creditAmount (valor a favor por devoluciones), se descuenta del total
  const creditAmount = useMemo(() => pending?.creditAmount || 0, [pending])
  const totalAPagar = useMemo(() => Math.max(0, subtotalConDescuento - creditAmount), [subtotalConDescuento, creditAmount])
  
  // Cálculo del IVA: Los precios incluyen 19% IVA
  // Si total = base * 1.19, entonces base = total / 1.19, e IVA = total - base
  const baseNeta = useMemo(() => totalAPagar / 1.19, [totalAPagar])
  const ivaAmount = useMemo(() => totalAPagar - baseNeta, [totalAPagar, baseNeta])
  
  
  const pagoEfectivo = useMemo(() => parseCOP(efectivo||'') || 0, [efectivo])
  const pagoTransferencia = useMemo(() => parseCOP(transferencia||'') || 0, [transferencia])
  const pagoTarjeta = useMemo(() => parseCOP(tarjetaValor||'') || 0, [tarjetaValor])
  const pagoOtro = useMemo(() => parseCOP(otroPagoValor||'') || 0, [otroPagoValor])
  const sumaPagos = useMemo(() => pagoEfectivo + pagoTransferencia + pagoTarjeta + pagoOtro, [pagoEfectivo, pagoTransferencia, pagoTarjeta, pagoOtro])
  const restante = useMemo(() => Math.max(0, totalAPagar - sumaPagos), [totalAPagar, sumaPagos])
  const cambio = useMemo(() => sumaPagos > totalAPagar ? (sumaPagos - totalAPagar) : 0, [sumaPagos, totalAPagar])

  function metodoPrincipal() {
    const activos = [
      pagoEfectivo>0 && 'Efectivo',
      pagoTransferencia>0 && 'Transferencia',
      pagoTarjeta>0 && 'Tarjeta',
      pagoOtro>0 && 'Otro'
    ].filter(Boolean)
    if (activos.length === 1) return activos[0]
    if (activos.length === 0) return 'Sin pago'
    return 'Mixto'
  }

  async function handleGenerarFactura() {
    if (!pending) return
    if (restante > 0) return
    
    // EXTRAER DOCUMENTO DEL CLIENTE DIRECTAMENTE DE pending (no del state)
    let docCliente = ''
    if (pending?.customer?.customer_id) {
      docCliente = String(pending.customer.customer_id).trim()
    } else if (pending?.customerId) {
      docCliente = String(pending.customerId).trim()
    }
    
    console.log('🔍 Validando customerDocument desde pending:', {
      valor: docCliente,
      esVacio: docCliente.length === 0,
      fuente: pending?.customer?.customer_id ? 'DevolucionesCaja' : 'Cash.jsx',
      pending_customer_id: pending?.customer?.customer_id,
      pending_customerId: pending?.customerId
    })
    
    if (!docCliente || docCliente.length === 0) {
      console.error('❌ FALLO: No hay documento del cliente válido')
      setError('Error: No hay documento del cliente. Por favor, regrese y capture los datos del cliente.')
      return
    }
    
    console.log('✅ Documento válido, procediendo con facturación:', docCliente)
    setGenerating(true)
    setError('')
    
    try {
      // Obtener documento del empleado actual desde la cuenta autenticada
      let employeeDoc = ''
      
      try {
        // 1. Obtener del usuario autenticado
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log('👤 Usuario autenticado:', user.email)
          
          // Buscar documento en múltiples lugares del user_metadata
          if (user.user_metadata?.documentId) {
            employeeDoc = String(user.user_metadata.documentId).trim()
            console.log('📌 Documento encontrado en documentId:', employeeDoc)
          } else if (user.user_metadata?.document) {
            employeeDoc = String(user.user_metadata.document).trim()
            console.log('📌 Documento encontrado en document:', employeeDoc)
          } else if (user.user_metadata?.identification_number) {
            employeeDoc = String(user.user_metadata.identification_number).trim()
            console.log('📌 Documento encontrado en identification_number:', employeeDoc)
          } else {
            // Si no hay documento en metadata, intenta obtener de la tabla employee
            console.log('ℹ️ No hay documento en user_metadata, buscando en tabla employee...')
            const { data: empData } = await supabase
              .schema('trendo')
              .from('employee')
              .select('em_document')
              .eq('auth_user_id', user.id)
              .maybeSingle()
            
            if (empData?.em_document) {
              employeeDoc = String(empData.em_document).trim()
              console.log('📌 Documento obtenido de tabla employee:', employeeDoc)
            }
          }
        }
      } catch (e) {
        console.error('Error obteniendo documento de Supabase:', e.message)
      }
      
      // Fallback: intentar desde localStorage
      if (!employeeDoc) {
        try {
          const mockUser = JSON.parse(window.localStorage?.getItem('mock_user') || 'null')
          if (mockUser?.documentId) {
            employeeDoc = mockUser.documentId
            console.log('📌 Documento desde localStorage:', employeeDoc)
          }
        } catch (e2) {
          console.warn('No se pudo obtener documento del localStorage:', e2)
        }
      }
      
      // Validar que tenemos documento
      if (!employeeDoc) {
        console.warn('⚠️ No se encontró documento de empleado')
      } else {
        console.log('✅ Documento de empleado confirmado:', employeeDoc.substring(0, 5) + '***')
      }
      
      // Validar stock justo antes (por concurrencia)
      for (const l of pending.cart) {
        const item = await findItemByCode(l.code)
        if (!item) throw new Error(`ITEM ${l.code} no existe`)
        if ((item[l.size]||0) < l.qty) throw new Error(`Sin stock para ${l.code} (${l.size})`)
      }
      // Descontar stock
      for (const l of pending.cart) {
        await adjustStockByItem(l.code, l.size, -Math.abs(parseInt(l.qty)||0))
      }
      // Registrar venta
      const shift = await getActiveShift()
      if (!shift) throw new Error('No hay turno activo')
      
      const saleRecord = await addSale({
        total: totalAPagar,
        items: pending.items,
        method: metodoPrincipal(),
        customerId: docCliente,
        tipoComprobante: pending.invoiceType || '',
        employeeDocument: employeeDoc
      })
      console.log('✓ Venta registrada localmente con documento empleado:', employeeDoc)
      
      // Guardar detalles de la venta en tabla bill - AGRUPAR ITEMS IGUALES
      if (pending.cart && pending.cart.length > 0) {
        console.log(`📝 Procesando ${pending.cart.length} items del carrito...`)
        console.log(`📌 Sale ID local (UUID): ${saleRecord.id}`)
        console.log(`📌 Customer Document a usar: ${docCliente}`)
        
        // Agrupar items por código de producto
        const itemsAgrupados = {}
        for (const item of pending.cart) {
          const code = item.code
          const sizeKey = (item.size || '').toString().trim().toLowerCase()
          const groupKey = `${code}::${sizeKey}`
          if (!itemsAgrupados[groupKey]) {
            itemsAgrupados[groupKey] = {
              ...item,
              qty: 0
            }
          }
          itemsAgrupados[groupKey].qty += parseInt(item.qty) || 1
        }
        
        console.log(`✓ Items agrupados: ${Object.keys(itemsAgrupados).length} combinación(es) producto+talla`)
        
        // Crear una factura única con todos los items agrupados
        for (const groupKey of Object.keys(itemsAgrupados)) {
          const item = itemsAgrupados[groupKey]
          try {
            // Usar docCliente que ya fue validado
            if (!docCliente || docCliente.length === 0) {
              throw new Error('customer_document no puede estar vacío (validación final)')
            }
            
            const billDetail = {
              quantity: parseInt(item.qty), // Cantidad total agrupada
              price: parseFloat(item.price) || 0,
              type_transaction: metodoPrincipal() || 'efectivo',
              sale_consecutive: saleRecord.id, // UUID de la venta
              product_id: item.code || null,
              customer_document: docCliente,
              size: item.size ? String(item.size).trim().toLowerCase() : null,
              product_name: item.name || item.title || null
            }
            console.log(`  📍 Agregando: ${item.code} talla ${item.size || 'N/A'} x${item.qty} unidades, cliente: ${docCliente}`)
            
            await addBill(billDetail)
            console.log(`  ✓ Guardado en bill`)
          } catch (billError) {
            console.error(`  ✗ Error guardando ${item.code}:`, billError.message)
          }
        }
        console.log(`✓ Factura creada con ${Object.keys(itemsAgrupados).length} línea(s) de detalle`)
      }
      
      // Sincronizar venta a Supabase
      try {
        console.log('🔄 Sincronizando venta a Supabase con employee_document:', employeeDoc)
        await syncAll()
        console.log('✓ Venta y detalles sincronizados correctamente a Supabase')
        
        // Obtener el sale_consecutive real de Supabase (se genera en la sincronización)
        // Buscar la venta que se acaba de crear por fecha y cliente
        try {
          const { data: syncedSale } = await supabase
            .schema('trendo')
            .from('sale')
            .select('consecutive')
            .eq('customer_document', pending.customerId || '')
            .eq('employee_document', employeeDoc)
            .order('sale_date', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (syncedSale?.consecutive) {
            console.log('📌 Sale consecutive obtenido de Supabase:', syncedSale.consecutive)
            // Aquí podríamos actualizar los bills locales con el consecutive correcto
            // Por ahora solo lo logueamos
          }
        } catch (e) {
          console.warn('No se pudo obtener sale_consecutive:', e.message)
        }
      } catch (syncError) {
        console.error('✗ Error sincronizando:', syncError.message)
        console.warn('Los datos se guardaron localmente, se sincronizarán más tarde')
      }
      
      await setMeta('pending_sale', null)
      console.log('✓ Factura generada exitosamente')
      
      setGenerating(false)
      
      // Navegar a pantalla de progreso de facturación
      const saleData = {
        sale_id: saleRecord?.id,
        consecutive: saleRecord?.id,
        created_at: saleRecord?.created_at,
        customer_document: docCliente,
        customer_name: (() => {
          // Intentar obtener el nombre completo desde múltiples estructuras posibles
          if (pending?.customer) {
            const c = pending.customer
            // Opción 1: Campos separados first_name/last_name (de DevolucionesCaja)
            if (c.first_name || c.second_name || c.last_name) {
              const parts = [c.first_name, c.second_name, c.last_name].filter(Boolean)
              if (parts.length > 0) return parts.join(' ').trim()
            }
            // Opción 2: Campo directo name
            if (c.name) return c.name
            // Opción 3: Campos nombres/apellidos
            if (c.nombres || c.apellidos) {
              const parts = [c.nombres, c.apellidos].filter(Boolean)
              if (parts.length > 0) return parts.join(' ').trim()
            }
          }
          // Valor por defecto si no hay nombre
          return 'Consumidor Final'
        })(),
        customer_email: pending?.customer?.email || '',
        customer_phone: pending?.customer?.phone_number || pending?.customer?.phoneNumber || '',
        customer_address: pending?.customer?.address || '',
        customer_city: pending?.customer?.city || '',
        items: pending.cart || [],
        subtotal: subtotal,
        discount: descuentoVal,
        credit: creditAmount,
        base: baseNeta,
        iva: ivaAmount,
        total: totalAPagar,
        payment_method: metodoPrincipal(),
        employee_document: employeeDoc
      }
      
      if (typeof onNavigate === 'function') {
        onNavigate('invoice-progress', {
          saleData,
          invoiceType: pending.invoiceType || 'Factura POS'
        })
      }
    } catch (e) {
      console.error('Error al generar factura:', e)
      setError(e.message || 'Error al generar factura')
      setGenerating(false)
    }
  }

  if (loading) return <div className="p-8 text-sm">Cargando…</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!pending) return <div className="p-8 text-sm">No hay venta pendiente. <button className="underline" onClick={()=> onNavigate?.('cash')}>Volver a Caja</button></div>

  return (
    <div className="flex h-full bg-white dark:bg-neutral-900 dark:text-gray-100 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={()=> onBack?.()} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className="text-2xl font-semibold text-black dark:text-white">Cobro</h2>
            <span className="px-2 py-1 rounded text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{pending.invoiceType}</span>
          </div>
          <button onClick={onLogout} className="px-3 py-2 rounded border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition">Cerrar sesión</button>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Métodos de pago */}
          <div className="lg:col-span-2 space-y-4">
            {/* INGRESAR PAGOS - Efectivo y Transferencia */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
              <h3 className="font-medium mb-3 text-black dark:text-white">Ingresar Pagos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Efectivo</label>
                  <input 
                    type="text" 
                    value={efectivo} 
                    onChange={e=>setEfectivo(formatCOPInput(e.target.value))} 
                    inputMode="numeric" 
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Transferencia</label>
                  <input 
                    type="text" 
                    value={transferencia} 
                    onChange={e=>setTransferencia(formatCOPInput(e.target.value))} 
                    inputMode="numeric" 
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>

            {/* PAGO CON TARJETA */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
              <h3 className="font-medium mb-3 text-black dark:text-white">Pago con Tarjeta</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Tipo</label>
                  <select 
                    value={tarjetaTipo} 
                    onChange={e=>setTarjetaTipo(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="credito">Crédito</option>
                    <option value="debito">Débito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Nro Voucher</label>
                  <input 
                    type="text" 
                    value={tarjetaVoucher} 
                    onChange={e=>setTarjetaVoucher(e.target.value)} 
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: 123456" 
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Valor</label>
                  <input 
                    type="text" 
                    value={tarjetaValor} 
                    onChange={e=>setTarjetaValor(formatCOPInput(e.target.value))} 
                    inputMode="numeric" 
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>

            {/* OTROS PAGOS */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
              <h3 className="font-medium mb-3 text-black dark:text-white">Otros Pagos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Tipo</label>
                  <select 
                    value={otroPagoTipo} 
                    onChange={e=>setOtroPagoTipo(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="addi">Addi</option>
                    <option value="sistecredito">SisteCredito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Valor a Pagar</label>
                  <input 
                    type="text" 
                    value={otroPagoValor} 
                    onChange={e=>setOtroPagoValor(formatCOPInput(e.target.value))} 
                    inputMode="numeric" 
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Panel derecho resumen */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 h-full flex flex-col">
            <h3 className="font-medium mb-4 text-black dark:text-white">Resumen</h3>
            
            {/* Mostrar datos del cliente si viene de Devoluciones */}
            {customerDocument && pending?.customer && (
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-neutral-600">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Cliente</p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{pending.customer.identification_type}:</span>
                    <span className="font-semibold text-black dark:text-white">{pending.customer.customer_id}</span>
                  </div>
                  {pending.customer.first_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Primer Nombre:</span>
                      <span className="font-semibold text-black dark:text-white">{pending.customer.first_name}</span>
                    </div>
                  )}
                  {pending.customer.second_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Segundo Nombre:</span>
                      <span className="font-semibold text-black dark:text-white">{pending.customer.second_name}</span>
                    </div>
                  )}
                  {pending.customer.last_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Primer Apellido:</span>
                      <span className="font-semibold text-black dark:text-white">{pending.customer.last_name}</span>
                    </div>
                  )}
                  {pending.customer.second_last_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Segundo Apellido:</span>
                      <span className="font-semibold text-black dark:text-white">{pending.customer.second_last_name}</span>
                    </div>
                  )}
                  {pending.customer.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Correo:</span>
                      <span className="font-semibold text-black dark:text-white">{pending.customer.email}</span>
                    </div>
                  )}
                  {pending.customer.phone_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Celular:</span>
                      <span className="font-semibold text-black dark:text-white">{pending.customer.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Subtotal</span><span className="font-semibold">{formatCOP(subtotal)}</span></div>
              {creditAmount > 0 && (
                <div className="flex justify-between text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-700">
                  <span className="text-green-700 dark:text-green-300">Valor a favor (devolución)</span>
                  <span className="font-semibold text-green-700 dark:text-green-300">-{formatCOP(creditAmount)}</span>
                </div>
              )}
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-gray-600 dark:text-gray-400 text-sm">Descuento (%)</label>
                  <input
                    value={descuentoPct}
                    onChange={e=> {
                      const v = e.target.value.replace(/[^0-9.,]/g,'')
                      const num = parseFloat(v.replace(/,/g,'').replace('%',''))
                      if (!v || (isFinite(num) && num >= 0 && num <= 100)) {
                        setDescuentoPct(v)
                      }
                    }}
                    inputMode="numeric"
                    className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-right"
                    placeholder="0"
                  />
                </div>
                {descuentoPercent > 100 && (<div className="text-[10px] text-red-600 mt-1">% inválido (máx 100).</div>)}
                {descuentoPercent > 0 && descuentoPercent <= 100 && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Descuento: {descuentoPercent.toFixed(2)}% ({formatCOP(descuentoVal)})</div>
                )}
              </div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">Base neta (sin IVA)</span><span className="font-semibold">{formatCOP(baseNeta)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-400">IVA (19%)</span><span className="font-semibold text-blue-600 dark:text-blue-400">{formatCOP(ivaAmount)}</span></div>
              <div className="flex justify-between border-t pt-3 mt-3 text-base">
                <span className="text-gray-700 dark:text-gray-300 font-medium">TOTAL A PAGAR</span>
                <span className="font-bold text-black dark:text-white text-lg">{formatCOP(totalAPagar)}</span>
              </div>
            </div>
            <button
              onClick={handleGenerarFactura}
              disabled={generating || restante > 0 || (descuentoPercent > 100)}
              className="mt-4 w-full px-4 py-3 rounded bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generando…' : 'Generar Factura'}
            </button>
            {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
            {cambio > 0 && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 flex flex-col justify-center">
                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Cambio a favor del comprador</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCOP(cambio)}</div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
