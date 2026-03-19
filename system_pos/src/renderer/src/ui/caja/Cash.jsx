import { useMemo, useState, useEffect, useRef } from 'react'
import {
  setMeta,
  findItemByCode,
  getActiveShift,
  findCustomerByIdentification,
  upsertCustomer
} from '@/services/db'
import SidebarCaja from './Layout/Sidebar'
import { formatCOP } from '@/lib/currency'
import { useScanner } from '@/lib/useScanner'

export default function Cash({ onBack, onLogout, onNavigate }) {
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [foundItem, setFoundItem] = useState(null)
  const [selectSize, setSelectSize] = useState('m')
  const [selectQty, setSelectQty] = useState('1')
  const [toast, setToast] = useState(null)
  const [activeShift, setActiveShift] = useState(null)
  const [invoiceType, setInvoiceType] = useState('Facturación POS')

  const [clientType, setClientType] = useState('Persona')
  const [identType, setIdentType] = useState('CC')
  const [identNumber, setIdentNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [secondName, setSecondName] = useState('')
  const [lastName, setLastName] = useState('')
  const [secondLastName, setSecondLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneIndicative, setPhoneIndicative] = useState('+57')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [saving, setSaving] = useState(false)

  const identBlurTimeoutRef = useRef(null)

  useScanner({ onScan: code => { setSearch(code); handleLookup(code) } })

  useEffect(() => {
    let mounted = true
    async function load() {
      const s = await getActiveShift()
      if (mounted) setActiveShift(s || null)
    }
    load()
    const id = setInterval(load, 15000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  const total = useMemo(() => cart.reduce((acc, l) => acc + (Number(l.price) || 0) * (parseInt(l.qty) || 0), 0), [cart])
  const items = useMemo(() => cart.reduce((acc, l) => acc + (parseInt(l.qty) || 0), 0), [cart])

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 2000)
  }

  async function handleLookup(val) {
    const code = String(val || search).trim()
    if (!code) { setFoundItem(null); return }
    const item = await findItemByCode(code)
    setFoundItem(item || null)
    if (item) {
      setSelectSize('m')
      setSelectQty('1')
    }
  }

  // Calcular stock disponible considerando lo que ya está en el carrito
  function getAvailableStock(itemCode, size) {
    if (!foundItem) return 0
    const baseStock = parseInt(foundItem[size] || 0)
    const alreadyInCart = cart
      .filter(c => c.code === itemCode && c.size === size)
      .reduce((sum, c) => sum + c.qty, 0)
    return Math.max(0, baseStock - alreadyInCart)
  }

  async function addLineFromSelection() {
    if (!foundItem) return showToast('Sin producto cargado', 'error')
    const q = parseInt(selectQty)
    const p = Number(foundItem.price) || 0
    if (!['xs', 's', 'm', 'l', 'xl'].includes(selectSize)) return showToast('Talla inválida', 'error')
    if (isNaN(q) || q <= 0) return showToast('Cantidad inválida', 'error')
    if (isNaN(p) || p <= 0) return showToast('Precio inválido', 'error')
    const available = getAvailableStock(foundItem.item, selectSize)
    if (available < q) return showToast(`Stock insuficiente en talla ${selectSize.toUpperCase()} (${available} disponible)`, 'error')
    setCart(prev => [...prev, { code: foundItem.item, size: selectSize, qty: q, price: p, name: foundItem.title || foundItem.item }])
    setFoundItem(null)
    setSearch('')
    showToast('Agregado al carrito', 'success')
  }

  function removeLine(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  function customerValid() {
    if (!customerId) return false
    return firstName.trim() && lastName.trim()
  }

  async function handleCobrar() {
    if (cart.length === 0) return showToast('Carrito vacío', 'error')
    if (!activeShift) return showToast('Debe abrir un turno antes de facturar', 'error')
    if (!customerValid()) return showToast('Datos de cliente incompletos', 'error')

    for (const l of cart) {
      const item = await findItemByCode(l.code)
      if (!item) return showToast(`ITEM ${l.code} no existe`, 'error')
      if ((item[l.size] || 0) < l.qty) return showToast(`Sin stock para ${l.code} (${l.size})`, 'error')
    }

    // Construir objeto de cliente completo
    const customerData = {
      customer_id: customerId,
      customer_type: clientType,
      identification_type: identType,
      first_name: firstName,
      second_name: secondName,
      last_name: lastName,
      second_last_name: secondLastName,
      email: email,
      phone_indicative: phoneIndicative,
      phone_number: phoneNumber
    }

    const pending = {
      cart,
      total,
      items,
      customerId,
      invoiceType,
      customer: customerData // Pasar datos completos del cliente
    }
    await setMeta('pending_sale', pending)
    if (typeof onNavigate === 'function') onNavigate('payment')
  }
  function hydrateCustomer(existing) {
    if (!existing) return
    setCustomerId(existing.customer_id || '')
    setClientType(existing.customer_type || 'Persona')
    setIdentType(existing.identification_type || 'CC')
    setIdentNumber(existing.customer_id || '')
    setFirstName(existing.first_name || '')
    setSecondName(existing.second_name || '')
    setLastName(existing.last_name || '')
    setSecondLastName(existing.second_last_name || '')
    setEmail(existing.email || '')
    
    setPhoneIndicative(existing.phone_indicative || '+57')
    
    // phone_number ya contiene solo el numero, sin indicativo
    const phoneNum = existing.phone_number || existing.phoneNumber || ''
    setPhoneNumber(phoneNum)
  }

  async function handleIdentBlur() {
    if (!identNumber.trim()) return
    
    // Usar debounce: si se ejecutó hace poco, no ejecutar de nuevo
    if (identBlurTimeoutRef.current) {
      clearTimeout(identBlurTimeoutRef.current)
    }

    identBlurTimeoutRef.current = setTimeout(async () => {
      try {
        const existing = await findCustomerByIdentification(identNumber.trim())
        if (existing && existing.customer_id) {
          hydrateCustomer(existing)
          showToast('Cliente cargado', 'success')
        } else {
          setCustomerId('')
          showToast('Cliente no encontrado', 'info')
        }
      } catch (error) {
        console.error('Error buscando cliente:', error)
        showToast('Error al buscar cliente', 'error')
      }
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (identBlurTimeoutRef.current) {
        clearTimeout(identBlurTimeoutRef.current)
      }
    }
  }, [])

  async function handleVerifyCustomer() {
    if (!identNumber.trim()) return showToast('Número de identificación requerido', 'error')
    
    const customerDisplay = firstName && lastName 
      ? `${firstName} ${lastName}`
      : firstName || 'Cliente'
    
    // Mostrar confirmación
    if (confirm(`¿Confirmar que este es el cliente a registrar en la factura?\n\nIdentificación: ${identType} ${identNumber}\nNombre: ${customerDisplay}`)) {
      setCustomerId(identNumber.trim())
      showToast(`Cliente asegurado: ${customerDisplay}`, 'success')
    }
  }

  async function handleGuardarCliente() {
    if (!identNumber.trim()) return showToast('Identificación requerida', 'error')
    if (saving) return // Evitar múltiples envíos

    // Función helper para trim seguro
    const safeTrim = (value) => {
      if (!value || typeof value !== 'string') return null
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }

    // Validar que al menos haya teléfono
    const phoneNum = safeTrim(phoneNumber)
    const phoneIndicativeVal = safeTrim(phoneIndicative) || '+57'
    
    if (!phoneNum) return showToast('Celular es requerido', 'error')

    setSaving(true)
    
    try {
      // Para empresas, usar el NIT/documento como nombre
      let fname = null
      let lname = null
      
      if (clientType === 'Empresa') {
        // Empresa: usar el NIT como first_name, empresa como last_name
        fname = identNumber.trim()
        lname = 'Empresa'
      } else {
        // Persona: usar los nombres/apellidos capturados
        fname = safeTrim(firstName)
        lname = safeTrim(lastName)
      }

      // Payload con los nombres de columna correctos para Supabase
      // phone_number: solo el numero sin indicativo
      // phone_indicative: el indicativo por separado
      const payload = {
        customer_id: identNumber.trim(),
        customer_type: clientType,
        identification_type: identType,
        first_name: fname,
        second_name: safeTrim(secondName),
        last_name: lname,
        second_last_name: safeTrim(secondLastName),
        email: safeTrim(email),
        phone_indicative: phoneIndicativeVal,
        phone_number: phoneNum
      }

      console.log('📋 Payload a guardar:', payload)

      const saved = await upsertCustomer(payload)
      if (saved) {
        hydrateCustomer(saved)
        showToast('Cliente guardado correctamente', 'success')
      }
    } catch (error) {
      console.error('No se pudo guardar cliente', error)
      showToast(error?.message || 'Error al guardar cliente', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100 overflow-hidden">
      <SidebarCaja onNavigate={onNavigate} currentView="cash" onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 dark:text-gray-100">
        <div className="p-8">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className="text-2xl font-semibold text-black dark:text-white">Caja</h2>
            {activeShift ? (
              <span className="px-2 py-1 rounded text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Turno activo</span>
            ) : (
              <span className="px-2 py-1 rounded text-[11px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Sin turno</span>
            )}
          </div>
          <button onClick={onLogout} className="px-3 py-2 rounded border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition">Cerrar sesión</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 relative">
          {toast && (
            <div className="fixed right-6 top-6 z-50">
              <div className={`${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-black'} text-white px-3 py-2 rounded shadow text-sm`}>{toast.msg}</div>
            </div>
          )}

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1">
            <h3 className="font-medium mb-3 text-black dark:text-white">Producto</h3>
            <label className="block text-sm mb-1 text-black dark:text-gray-200">Buscar (Código / Nombre / Escáner)</label>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value) }}
              onBlur={() => handleLookup(search)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(search) } }}
              className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600 mb-3"
              placeholder="Escanee o escriba y Enter"
            />
            {foundItem ? (
              <div className="space-y-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">ITEM: <span className="font-semibold text-black dark:text-white">{foundItem.item}</span></div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Título: <span className="font-semibold text-black dark:text-white">{foundItem.title || '—'}</span></div>
                <div className="grid grid-cols-5 gap-0.5 text-[10px]">
                  {['xs', 's', 'm', 'l', 'xl'].map(sz => (
                    <div key={sz} className={`p-1 rounded border text-center ${selectSize === sz ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'} border-gray-300 dark:border-neutral-600 cursor-pointer`} onClick={() => setSelectSize(sz)}>
                      {sz.toUpperCase()} ({getAvailableStock(foundItem.item, sz)})
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Cantidad</label>
                    <input type="number" value={selectQty} onChange={e => setSelectQty(e.target.value)} className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 border border-gray-300 dark:border-neutral-600 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Precio (COP)</label>
                    <div className="w-full bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 border border-gray-300 dark:border-neutral-600 text-sm">
                      {formatCOP(Number(foundItem?.price || 0))}
                    </div>
                  </div>
                </div>
                <button onClick={addLineFromSelection} className="w-full px-3 py-2 rounded bg-black text-white hover:bg-gray-900 text-sm">Agregar</button>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">Ingrese el código y presione Enter para cargar.</div>
            )}
            <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-3">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="py-1">ITEM</th>
                    <th className="py-1">Talla</th>
                    <th className="py-1">Cant.</th>
                    <th className="py-1">Precio</th>
                    <th className="py-1">Subt.</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((l, idx) => (
                    <tr key={idx} className="border-t border-gray-100 dark:border-neutral-700">
                      <td className="py-1">{l.name}</td>
                      <td className="py-1">{l.size.toUpperCase()}</td>
                      <td className="py-1">{l.qty}</td>
                      <td className="py-1">{formatCOP(Number(l.price))}</td>
                      <td className="py-1">{formatCOP(Number(l.price) * Number(l.qty))}</td>
                      <td className="py-1 text-right">
                        <button onClick={() => removeLine(idx)} className="px-2 py-1 text-xs rounded border border-red-200 dark:border-red-400/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Quitar</button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr><td colSpan={6} className="py-3 text-center text-gray-500 dark:text-gray-400">Carrito vacío</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1 order-last lg:order-none">
            <h3 className="font-medium mb-3 text-black dark:text-white">Cliente</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tipo de Cliente</label>
                <select value={clientType} onChange={e => setClientType(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-gray-900 dark:text-gray-100">
                  <option>Persona</option>
                  <option>Empresa</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Tipo Ident.</label>
                  <select value={identType} onChange={e => setIdentType(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100">
                    {['NIT', 'CC', 'TI', 'Registro Civil', 'Tarjeta de extranjeria', 'Pasaporte', 'Documento de identificacion de extranjero', 'NUIP', 'PEP', 'Sin identificacion', 'NIT de otro pais', 'PPT', 'Salvaconducto'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Número</label>
                  <input value={identNumber} onChange={e => setIdentNumber(e.target.value)} onBlur={handleIdentBlur} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" placeholder="Identificación" />
                </div>
              </div>

              {clientType === 'Persona' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Primer Nombre</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Segundo Nombre</label>
                    <input value={secondName} onChange={e => setSecondName(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Primer Apellido</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Segundo Apellido</label>
                    <input value={secondLastName} onChange={e => setSecondLastName(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              )}

              {/* Sin campos adicionales para Empresa */}

              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Correo</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Indicativo</label>
                  <input value={phoneIndicative} onChange={e => setPhoneIndicative(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Celular</label>
                  <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleVerifyCustomer} className="flex-1 px-3 py-2 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50 font-medium">{customerId ? '✓ Cliente Asegurado' : 'Confirmar Cliente'}</button>
                <button onClick={handleGuardarCliente} disabled={saving} className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 text-xs hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Guardando…' : 'Guardar Cliente'}</button>
              </div>
              {customerId && (
                <div className="text-[10px] text-green-600 dark:text-green-400">Cliente listo: {customerId.slice(0, 8)}</div>
              )}

              <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 tracking-wide">Tipo de factura</label>
                <select
                  value={invoiceType}
                  onChange={e => setInvoiceType(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-2 py-2 border border-gray-300 dark:border-neutral-600"
                >
                  <option>Facturación POS</option>
                  <option>Facturación electrónica</option>
                </select>
                <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">Requerido para generar la factura.</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="mt-2 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 justify-center overflow-x-auto">
              <div className="flex flex-col items-center md:items-start gap-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 tracking-wide">TOTAL COMPRA</div>
                <div className="text-4xl font-bold text-black dark:text-white leading-tight">{formatCOP(total)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Prendas: <span className="font-semibold text-black dark:text-white">{items}</span></div>
              </div>
              <div className="flex items-center gap-3 md:ml-8">
                <button onClick={handleCobrar} disabled={!activeShift || !customerValid() || cart.length === 0} className="px-6 py-3 rounded bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow">
                  Cobrar
                </button>
              </div>
            </div>
            {!activeShift && (<div className="text-xs text-red-600 mt-2">Abra un turno para registrar ventas.</div>)}
            {activeShift && !customerValid() && (<div className="text-xs text-gray-600 mt-2">Complete datos del cliente para continuar.</div>)}
            {activeShift && customerValid() && cart.length === 0 && (<div className="text-xs text-gray-600 mt-2">Agregue al menos un producto.</div>)}
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}