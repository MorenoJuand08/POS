/* eslint-disable no-undef */
import { useEffect, useState, useMemo, useRef } from 'react'
import { listReturns, addReturn, listItems, findItemByCode, getActiveShift, setMeta, getSalesByCustomerId, getBillsBySaleId, findCustomerByIdentification } from '@/services/db'
import { formatCOP } from '@/lib/currency'
import { liveQuery } from 'dexie'
import SidebarCaja from './Layout/Sidebar'
import { useScanner } from '@/lib/useScanner'

const SIZE_OPTIONS = ['xs', 's', 'm', 'l', 'xl']

function useLiveQuery(fn, deps = []) {
  const [data, setData] = useState([])
  useEffect(() => {
    const sub = liveQuery(fn).subscribe({ next: v => setData(v) })
    return () => sub.unsubscribe()
  }, deps)
  return data
}

export default function DevolucionesCaja({ onBack, onLogout, onNavigate }) {
  const returns = useLiveQuery(listReturns, [])
  const items = useLiveQuery(listItems, [])
  
  // Estados de turno
  const [activeShift, setActiveShift] = useState(null)
  const [shiftLoading, setShiftLoading] = useState(true)
  
  // Estados del formulario de búsqueda
  const [search, setSearch] = useState('')
  const [foundItem, setFoundItem] = useState(null)
  const [toast, setToast] = useState(null)

  // Estados del carrito de devoluciones
  const [devolutionList, setDevolutionList] = useState([])

  // Estados del formulario de devolución
  const [devForm, setDevForm] = useState({
    purchasedAt: '',
    reason: ''
  })

  // Estados de compra con crédito
  const [creditMode, setCreditMode] = useState(false)
  const [creditAmount, setCreditAmount] = useState(0)
  const [newCart, setNewCart] = useState([])
  const [newSearch, setNewSearch] = useState('')
  const [newFoundItem, setNewFoundItem] = useState(null)
  const [newSelectSize, setNewSelectSize] = useState('')
  const [newSelectQty, setNewSelectQty] = useState(1)

  // Estados para búsqueda por cédula
  const [cedularSearch, setCedularSearch] = useState('')
  const [cedularOrders, setCedularOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedItemSize, setSelectedItemSize] = useState('')

  // Estados para modal de cliente antes de Payment
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    customer_id: '',
    customer_type: 'Persona',
    identification_type: 'CC',
    first_name: '',
    second_name: '',
    last_name: '',
    second_last_name: '',
    email: '',
    phone_indicative: '+57',
    phone_number: ''
  })

  // Referencia para debounce en búsqueda de cliente por cédula
  const customerIdentBlurTimeoutRef = useRef(null)

  // Verificar turno activo al montar
  useEffect(() => {
    async function checkShift() {
      try {
        const shift = await getActiveShift()
        setActiveShift(shift)
      } catch {
        // Error silencioso
        setActiveShift(null)
      } finally {
        setShiftLoading(false)
      }
    }
    checkShift()
  }, [])

  // Limpiar timeout de debounce al desmontar
  useEffect(() => {
    return () => {
      if (customerIdentBlurTimeoutRef.current) {
        window.clearTimeout(customerIdentBlurTimeoutRef.current)
      }
    }
  }, [])

  useScanner({ onScan: code => { 
    if (creditMode) {
      handleNewLookup(code)
    } else {
      setSearch(code)
      handleLookup(code)
    }
  } })

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleLookup(val) {
    const code = String(val || search).trim()
    if (!code) { setFoundItem(null); return }
    const item = await findItemByCode(code)
    setFoundItem(item || null)
    if (!item) showToast('Producto no encontrado', 'error')
  }

  // Función para autocompletar cliente cuando se ingresa la cédula
  async function handleCustomerIdentificationBlur() {
    const identNumber = customerForm.customer_id.trim()
    if (!identNumber) return

    if (customerIdentBlurTimeoutRef.current) {
      window.clearTimeout(customerIdentBlurTimeoutRef.current)
    }

    customerIdentBlurTimeoutRef.current = window.setTimeout(async () => {
      try {
        const existing = await findCustomerByIdentification(identNumber)
        if (existing && existing.customer_id) {
          // Cliente encontrado - autocompletar los datos
          setCustomerForm({
            customer_id: existing.customer_id || '',
            customer_type: existing.customer_type || existing.type || 'Persona',
            identification_type: existing.identification_type || existing.identificationType || 'CC',
            first_name: existing.first_name || existing.nombres || '',
            second_name: existing.second_name || '',
            last_name: existing.last_name || existing.apellidos || '',
            second_last_name: existing.second_last_name || '',
            email: existing.email || '',
            phone_indicative: existing.phone_indicative || existing.phoneIndicative || '+57',
            phone_number: existing.phone_number || existing.phoneNumber || ''
          })
          showToast('Cliente cargado correctamente', 'success')
        } else {
          showToast('Cliente no encontrado en el sistema', 'info')
        }
      } catch (error) {
        console.error('Error buscando cliente:', error)
        showToast('Error al buscar cliente', 'error')
      }
    }, 300)
  }

  function addDevolution() {
    if (!foundItem) return showToast('Selecciona un producto', 'error')
    if (!devForm.purchasedAt) return showToast('Fecha de compra requerida', 'error')
    if (!devForm.reason) return showToast('Motivo requerido', 'error')

    const refundAmt = foundItem.price || 0

    setDevolutionList([...devolutionList, {
      id: `dev_${Date.now()}`,
      itemId: foundItem.id,
      itemName: foundItem.title || foundItem.item,
      itemCode: foundItem.item || foundItem.id.slice(0, 8),
      itemPrice: foundItem.price || 0,
      purchasedAt: devForm.purchasedAt,
      reason: devForm.reason,
      refundAmount: refundAmt,
      size: '',
      quantity: 1
    }])

    setFoundItem(null)
    setSearch('')
    setDevForm({ purchasedAt: '', reason: '' })
    showToast('Artículo agregado a devolución', 'success')
  }

  function removeDevolution(id) {
    setDevolutionList(devolutionList.filter(d => d.id !== id))
  }

  const totalRefund = useMemo(() => {
    return devolutionList.reduce((sum, d) => sum + d.refundAmount, 0)
  }, [devolutionList])

  async function submitDevoluciones() {
    if (!activeShift) return showToast('No hay un turno abierto', 'error')
    if (devolutionList.length === 0) return showToast('Sin artículos en devolución', 'error')

    try {
      for (const dev of devolutionList) {
        await addReturn({
          itemId: dev.itemId,
          reason: dev.reason,
          amount: dev.refundAmount,
          purchased_at: dev.purchasedAt,
          shiftId: activeShift.id,
          product_name: dev.itemName || dev.itemCode,
          size: dev.size || '',
          quantity: dev.quantity || 1,
          refund_amount: dev.refundAmount
        })
      }

      const total = devolutionList.reduce((sum, d) => sum + d.refundAmount, 0)
      setCreditAmount(total)
      setCreditMode(true)
      setNewCart([])
      setNewSearch('')
      setNewFoundItem(null)
      showToast(`${devolutionList.length} devolución(es) registrada(s)`, 'success')
      setDevolutionList([])
      setDevForm({ purchasedAt: '', reason: '' })
      setFoundItem(null)
      setSearch('')
    } catch {
      showToast('Error al registrar devoluciones', 'error')
    }
  }
  async function handleCedularLookup(cedula) {
    const cedText = String(cedula || cedularSearch).trim()
    if (!cedText) { setCedularOrders([]); return }
    
    try {
      const sales = await getSalesByCustomerId(cedText)
      if (!sales || sales.length === 0) {
        showToast('No hay compras con esta cédula', 'error')
        setCedularOrders([])
        return
      }

      // Agrupar por fecha de compra y obtener items de cada venta
      const groupedByDate = {}
      
      for (const sale of sales) {
        const date = sale.created_at ? new Date(sale.created_at).toLocaleDateString('es-ES') : 'Fecha desconocida'
        if (!groupedByDate[date]) groupedByDate[date] = []
        
        // Obtener los bills (items) de esta venta
        const bills = await getBillsBySaleId(sale.id)
        
        // Expandir cada bill en la venta: si hay cantidad > 1, crear una entrada por cada unidad
        if (bills && Array.isArray(bills)) {
          bills.forEach((bill, billIdx) => {
            const qty = bill.quantity || 1
            console.log(`📦 Bill #${billIdx}: product_id=${bill.product_id}, size="${bill.size}", product_name="${bill.product_name}"`)
            for (let i = 0; i < qty; i++) {
              groupedByDate[date].push({
                ...sale,
                expandedItem: {
                  product_id: bill.product_id || 'SIN ID',
                  product_name: bill.product_name || 'Producto',
                  price: bill.price || 0,
                  size: bill.size || '',
                  billId: bill.id,
                  originalIndex: billIdx,
                  unitNumber: i + 1,
                  totalQty: qty
                }
              })
            }
          })
        }
      }

      // Convertir a array ordenado por fecha
      const orderedOrders = Object.entries(groupedByDate)
        .sort((a, b) => {
          const dateA = a[0] === 'Fecha desconocida' ? new Date(0) : new Date(a[0].split('/').reverse().join('-'))
          const dateB = b[0] === 'Fecha desconocida' ? new Date(0) : new Date(b[0].split('/').reverse().join('-'))
          return dateB - dateA
        })
        .map(([date, items]) => ({ date, items }))

      setCedularOrders(orderedOrders)
      setSelectedOrder(null)
      setSelectedItem(null)
      showToast(`${sales.length} compra(s) encontrada(s)`, 'success')
    } catch {
      showToast('Error al buscar compras', 'error')
    }
  }

  async function confirmDevolution() {
    if (!selectedItem) return showToast('Selecciona un item', 'error')

    try {
      // Obtener el item seleccionado del estado actual
      const [orderIdx, itemIdx] = selectedItem.split('_').map(Number)
      const order = cedularOrders[orderIdx]
      const item = order?.items[itemIdx]
      
      if (!item || !item.expandedItem) {
        return showToast('Item no encontrado', 'error')
      }

      const expandedItem = item.expandedItem
      const recordedSize = (expandedItem.size || '').toString().trim()
      const normalizedRecordedSize = recordedSize.toLowerCase()
      const resolvedSize = selectedItemSize || normalizedRecordedSize

      if (!resolvedSize) return showToast('Selecciona una talla', 'error')

      const newItem = {
        id: `dev_${Date.now()}`,
        itemId: expandedItem.product_id,
        itemName: expandedItem.product_name || 'Producto',
        itemCode: expandedItem.product_id || 'UNKNOWN',
        itemPrice: expandedItem.price || 0,
        purchasedAt: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reason: 'Cliente solicitó devolución',
        refundAmount: expandedItem.price || 0,
        size: resolvedSize,
        quantity: 1
      }

      setDevolutionList([...devolutionList, newItem])
      showToast('Producto agregado a artículos a devolver', 'success')

      setCedularSearch('')
      setCedularOrders([])
      setSelectedOrder(null)
      setSelectedItem(null)
      setSelectedItemSize('')
    } catch {
      showToast('Error al procesar devolución', 'error')
    }
  }

  async function handleNewLookup(val) {
    const code = String(val || newSearch).trim()
    if (!code) { setNewFoundItem(null); return }
    const item = await findItemByCode(code)
    setNewFoundItem(item || null)
    if (!item) showToast('Producto no encontrado', 'error')
  }

  function addToNewCart() {
    if (!newFoundItem) return showToast('Selecciona un producto', 'error')
    if (!newSelectSize) return showToast('Selecciona una talla', 'error')
    
    const qty = parseInt(newSelectQty) || 1
    const available = getAvailableStockNew(newFoundItem.item, newSelectSize)
    if (available < qty) return showToast(`Stock insuficiente en talla ${newSelectSize.toUpperCase()} (${available} disponible)`, 'error')
    
    setNewCart([...newCart, {
      id: `cart_${Date.now()}`,
      itemId: newFoundItem.id,
      itemName: newFoundItem.title || newFoundItem.item,
      itemCode: newFoundItem.item || newFoundItem.id.slice(0, 8),
      price: newFoundItem.price || 0,
      quantity: qty,
      size: newSelectSize
    }])

    setNewFoundItem(null)
    setNewSearch('')
    setNewSelectSize('')
    setNewSelectQty(1)
    showToast('Producto agregado', 'success')
  }

  // Calcular stock disponible considerando lo que ya está en newCart
  function getAvailableStockNew(itemCode, size) {
    if (!newFoundItem) return 0
    const baseStock = parseInt(newFoundItem[size] || 0)
    const alreadyInCart = newCart
      .filter(c => c.itemCode === itemCode && c.size === size)
      .reduce((sum, c) => sum + c.quantity, 0)
    return Math.max(0, baseStock - alreadyInCart)
  }

  function removeFromNewCart(id) {
    setNewCart(newCart.filter(item => item.id !== id))
  }

  const newCartTotal = useMemo(() => {
    return newCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }, [newCart])

  const balance = useMemo(() => {
    return creditAmount - newCartTotal
  }, [creditAmount, newCartTotal])

  function proceedToPayment() {
    if (newCart.length === 0) return showToast('Agrega productos a la compra', 'error')
    
    // Mostrar modal para ingresar datos del cliente
    setCustomerForm({
      customer_id: '',
      customer_type: 'Persona',
      identification_type: 'CC',
      first_name: '',
      second_name: '',
      last_name: '',
      second_last_name: '',
      email: '',
      phone_indicative: '+57',
      phone_number: ''
    })
    setShowCustomerModal(true)
  }

  async function handleSaveCustomer() {
    if (!customerForm.customer_id.trim()) {
      showToast('Ingresa el documento del cliente', 'error')
      return
    }

    const safeTrim = (value) => {
      if (!value || typeof value !== 'string') return null
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }

    setSavingCustomer(true)
    try {
      // Guardar numero y indicativo por separado
      const phoneNum = safeTrim(customerForm.phone_number)
      const phoneIndicativeVal = safeTrim(customerForm.phone_indicative) || '+57'

      // Para empresas, usar el NIT/documento como nombre
      let firstName = null
      let lastName = null
      
      if (customerForm.customer_type === 'Empresa') {
        // Empresa: usar el NIT como first_name, empresa como last_name
        firstName = customerForm.customer_id.trim()
        lastName = 'Empresa'
      } else {
        // Persona: usar los nombres/apellidos capturados
        firstName = safeTrim(customerForm.first_name)
        lastName = safeTrim(customerForm.last_name)
      }

      const payload = {
        customer_id: customerForm.customer_id.trim(),
        customer_type: customerForm.customer_type,
        identification_type: customerForm.identification_type,
        first_name: firstName,
        second_name: safeTrim(customerForm.second_name),
        last_name: lastName,
        second_last_name: safeTrim(customerForm.second_last_name),
        email: safeTrim(customerForm.email),
        phone_indicative: phoneIndicativeVal,
        phone_number: phoneNum
      }

      console.log('📋 Guardando cliente:', payload)
      const { upsertCustomer } = await import('@/services/db')
      await upsertCustomer(payload)
      showToast('Cliente guardado correctamente', 'success')
    } catch (error) {
      console.error('Error guardando cliente:', error)
      showToast(error?.message || 'Error al guardar cliente', 'error')
    } finally {
      setSavingCustomer(false)
    }
  }

  function handleConfirmCustomerAndProceed() {
    if (!customerForm.customer_id.trim()) {
      showToast('Ingresa el documento del cliente', 'error')
      return
    }

    // Pasar al componente Payment con los datos
    const cartFormatted = newCart.map(item => ({
      code: item.itemCode,
      price: item.price,
      qty: item.quantity,
      size: item.size
    }))
    
    setMeta('pending_sale', {
      cart: cartFormatted,
      items: newCart.length,
      creditMode: true,
      creditAmount: creditAmount,
      totalSale: newCartTotal,
      balance: balance,
      customer: customerForm // Pasar todos los datos del cliente al Payment
    })
    
    setShowCustomerModal(false)
    onNavigate('payment')
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100">
      <SidebarCaja onNavigate={onNavigate} currentView="devoluciones" />
      <main className="flex-1 p-8 pb-24 bg-white dark:bg-neutral-900 dark:text-gray-100 min-h-screen overflow-y-auto">
        {shiftLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-xl text-gray-500 dark:text-gray-400 mb-2">Verificando turno...</div>
            </div>
          </div>
        ) : !activeShift ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-8 max-w-md text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">⚠️</div>
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-300 mb-2">No hay turno abierto</h2>
              <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                Debes abrir un turno antes de registrar devoluciones.
              </p>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        ) : creditMode ? (
          <>
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setCreditMode(false)} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <h2 className="text-2xl font-semibold text-black dark:text-white">Compra con Crédito</h2>
              </div>
              <button onClick={onLogout} className="px-3 py-2 rounded border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition">Cerrar sesión</button>
            </header>

            {/* Mostrar crédito disponible */}
            <div className="mb-6 p-6 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
              <div className="text-sm font-medium opacity-90 mb-2">Valor a Favor (Crédito Disponible)</div>
              <div className="text-5xl font-bold">{formatCOP(creditAmount)}</div>
            </div>

            {/* Toast */}
            {toast && (
              <div className="fixed right-6 top-6 z-50">
                <div className={`${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-black'} text-white px-4 py-3 rounded shadow-lg text-sm`}>
                  {toast.msg}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 items-start">
              {/* Panel Izquierdo: Búsqueda de productos */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
                <h3 className="font-medium mb-3 text-black dark:text-white">Agregar Productos</h3>
                
                <label className="block text-sm mb-1 text-black dark:text-gray-200">Buscar (Código / Nombre / Escáner)</label>
                <input
                  value={newSearch}
                  onChange={e => { setNewSearch(e.target.value) }}
                  onBlur={() => handleNewLookup(newSearch)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNewLookup(newSearch) } }}
                  className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600 mb-3"
                  placeholder="Escanee o escriba y Enter"
                  autoFocus
                />

                {newFoundItem ? (
                  <div className="space-y-3 p-3 rounded bg-gray-50 dark:bg-neutral-700/50 border border-gray-200 dark:border-neutral-600">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">ITEM: <span className="font-semibold text-black dark:text-white">{newFoundItem.item}</span></div>
                      <div className="text-sm font-medium text-black dark:text-white mt-1">{newFoundItem.title || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Precio: <span className="font-semibold text-black dark:text-white">{formatCOP(newFoundItem.price || 0)}</span></div>
                    </div>

                    <div>
                      <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Seleccionar Talla</label>
                      <div className="grid grid-cols-5 gap-0.5 text-[10px]">
                        {SIZE_OPTIONS.map(sz => (
                          <button
                            key={sz}
                            onClick={() => setNewSelectSize(sz)}
                            className={`p-1 rounded border text-center ${newSelectSize === sz ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'} border-gray-300 dark:border-neutral-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-neutral-600`}
                          >
                            {sz.toUpperCase()} ({getAvailableStockNew(newFoundItem.item, sz)})
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Cantidad</label>
                      <input
                        type="number"
                        value={newSelectQty}
                        onChange={e => setNewSelectQty(e.target.value)}
                        min="1"
                        className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 border border-gray-300 dark:border-neutral-600 text-sm"
                      />
                    </div>

                    <button
                      onClick={addToNewCart}
                      disabled={!newSelectSize}
                      className="w-full px-3 py-2 rounded bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Agregar al Carrito
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-3 text-center">Ingrese código y presione Enter</div>
                )}
              </div>

              {/* Panel Derecho: Carrito y resumen */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
                <h3 className="font-medium mb-3 text-black dark:text-white">Carrito de Compra</h3>
                
                <div className="space-y-3">
                  {/* Items en carrito */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {newCart.map(item => (
                      <div key={item.id} className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 text-xs flex justify-between items-start">
                        <div>
                          <div className="font-medium text-blue-900 dark:text-blue-300">{item.itemName}</div>
                          <div className="text-blue-700 dark:text-blue-400 mt-1">
                            Talla: {item.size?.toUpperCase() || 'N/A'} | {formatCOP(item.price)} x {item.quantity} = {formatCOP(item.price * item.quantity)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromNewCart(item.id)}
                          className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {newCart.length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 text-center p-4">
                        No hay productos agregados
                      </div>
                    )}
                  </div>

                  {/* Resumen */}
                  <div className="border-t border-gray-200 dark:border-neutral-700 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total de Compra:</span>
                      <span className="font-semibold text-black dark:text-white">{formatCOP(newCartTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Crédito Disponible:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{formatCOP(creditAmount)}</span>
                    </div>
                    
                    {/* Mostrar balance */}
                    {newCart.length > 0 && (
                      <div className={`p-3 rounded text-sm font-semibold text-center ${
                        balance >= 0 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      }`}>
                        {balance >= 0 
                          ? `Cambio a Favor: ${formatCOP(balance)}` 
                          : `EXCEDE: ${formatCOP(Math.abs(balance))} (Cliente debe pagar)`}
                      </div>
                    )}

                    <button
                      onClick={proceedToPayment}
                      disabled={newCart.length === 0}
                      className="w-full px-4 py-3 rounded bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
                    >
                      Proceder a Pago
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={onBack} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <h2 className="text-2xl font-semibold text-black dark:text-white">Devoluciones</h2>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Turno Activo</span>
              </div>
              <button onClick={onLogout} className="px-3 py-2 rounded border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition">Cerrar sesión</button>
            </header>

            {/* Toast */}
            {toast && (
              <div className="fixed right-6 top-6 z-50">
                <div className={`${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-black'} text-white px-4 py-3 rounded shadow-lg text-sm`}>
                  {toast.msg}
                </div>
              </div>
            )}

            {/* Búsqueda por Cédula */}
            <div className="mb-6 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
              <h3 className="font-medium mb-3 text-black dark:text-white">Búsqueda por Cédula del Cliente</h3>
              
              <label className="block text-sm mb-1 text-black dark:text-gray-200">Ingresar Cédula</label>
              <div className="flex gap-2 mb-4">
                <input
                  value={cedularSearch}
                  onChange={e => setCedularSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCedularLookup(cedularSearch) } }}
                  className="flex-1 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600"
                  placeholder="Cédula del cliente"
                />
                <button
                  onClick={() => handleCedularLookup(cedularSearch)}
                  className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  Buscar
                </button>
              </div>

              {cedularOrders.length > 0 && (
                <div className="space-y-2">
                  {cedularOrders.map((order, orderIdx) => (
                    <div key={`order_${orderIdx}`} className="border border-gray-300 dark:border-neutral-600 rounded overflow-hidden">
                      {/* Encabezado de Orden */}
                      <button
                        onClick={() => setSelectedOrder(selectedOrder === orderIdx ? null : orderIdx)}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors flex items-center justify-between"
                      >
                        <div className="text-left">
                          <div className="text-sm font-semibold text-black dark:text-white">{order.date}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{order.items.length} artículo(s)</div>
                        </div>
                        <svg className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${selectedOrder === orderIdx ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>

                      {/* Items dentro de la Orden */}
                      {selectedOrder === orderIdx && (
                        <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 space-y-2 border-t border-gray-300 dark:border-neutral-600">
                          {order.items.map((item, itemIdx) => {
                            const recordedSize = (item.expandedItem?.size || '').toString().trim()
                            const normalizedDisplaySize = recordedSize ? recordedSize.toUpperCase() : 'SIN TALLA'
                            return (
                              <div key={`item_${orderIdx}_${itemIdx}`} className="p-2 bg-white dark:bg-neutral-700 rounded border border-gray-200 dark:border-neutral-600">
                              {selectedItem === `${orderIdx}_${itemIdx}` ? (
                                <div className="space-y-2">
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">ID: <span className="font-semibold text-black dark:text-white">{item.expandedItem?.product_id || 'SIN ID'}</span></div>
                                    <div className="text-sm font-semibold text-black dark:text-white mt-1">{item.expandedItem?.product_name || 'Producto'}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Precio: <span className="font-semibold text-black dark:text-white">{formatCOP(item.expandedItem?.price || 0)}</span></div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Talla registrada: <span className="font-semibold text-black dark:text-white">{normalizedDisplaySize}</span></div>
                                    {item.expandedItem?.totalQty > 1 && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unidad {item.expandedItem?.unitNumber} de {item.expandedItem?.totalQty}</div>
                                    )}
                                  </div>

                                  {/* Selector de Talla */}
                                  <div>
                                    <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-300">Seleccionar Talla *</label>
                                    <div className="grid grid-cols-5 gap-0.5">
                                      {SIZE_OPTIONS.map(size => (
                                        <button
                                          key={size}
                                          onClick={() => setSelectedItemSize(size)}
                                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                            selectedItemSize === size
                                              ? 'bg-black text-white dark:bg-white dark:text-black'
                                              : 'bg-gray-200 dark:bg-neutral-600 text-black dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-neutral-500'
                                          }`}
                                        >
                                          {size.toUpperCase()}
                                        </button>
                                      ))}
                                    </div>
                                    {recordedSize && !SIZE_OPTIONS.includes(recordedSize.toLowerCase()) && (
                                      <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-300">
                                        Talla registrada: <span className="font-semibold">{normalizedDisplaySize}</span> (se usará automáticamente)
                                      </div>
                                    )}
                                  </div>

                                  {/* Botones de Acción */}
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={confirmDevolution}
                                      className="flex-1 px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      onClick={() => { setSelectedItem(null); setSelectedItemSize('') }}
                                      className="flex-1 px-2 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    const normalizedSizeKey = recordedSize.toLowerCase()
                                    setSelectedItem(`${orderIdx}_${itemIdx}`)
                                    setSelectedItemSize(normalizedSizeKey && SIZE_OPTIONS.includes(normalizedSizeKey) ? normalizedSizeKey : '')
                                  }}
                                  className="w-full text-left p-1 hover:bg-gray-100 dark:hover:bg-neutral-600 rounded transition-colors"
                                >
                                  <div className="text-xs text-gray-500 dark:text-gray-400">ID: <span className="font-semibold text-black dark:text-white">{item.expandedItem?.product_id || 'SIN ID'}</span></div>
                                  <div className="text-sm font-semibold text-black dark:text-white">{item.expandedItem?.product_name || 'Producto'}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Precio: {formatCOP(item.expandedItem?.price || 0)}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Talla: <span className="font-semibold text-black dark:text-white">{normalizedDisplaySize}</span></div>
                                  {item.expandedItem?.totalQty > 1 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unidad {item.expandedItem?.unitNumber} de {item.expandedItem?.totalQty}</div>
                                  )}
                                </button>
                              )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 relative items-start">
              {/* Panel Izquierdo: Búsqueda y Artículos */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1">
                <h3 className="font-medium mb-3 text-black dark:text-white">Búsqueda de Artículos</h3>
                
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
                  <div className="space-y-3 p-3 rounded bg-gray-50 dark:bg-neutral-700/50 border border-gray-200 dark:border-neutral-600">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">ITEM: <span className="font-semibold text-black dark:text-white">{foundItem.item}</span></div>
                      <div className="text-sm font-medium text-black dark:text-white mt-1">{foundItem.title || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Precio Original: <span className="font-semibold text-black dark:text-white">{formatCOP(foundItem.price || 0)}</span></div>
                    </div>

                    {/* Campos de Devolución */}
                    <div className="space-y-3 border-t border-gray-200 dark:border-neutral-600 pt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Fecha de Compra *</label>
                        <input
                          type="date"
                          value={devForm.purchasedAt}
                          onChange={e => setDevForm({ ...devForm, purchasedAt: e.target.value })}
                          className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Motivo de Devolución *</label>
                        <select
                          value={devForm.reason}
                          onChange={e => setDevForm({ ...devForm, reason: e.target.value })}
                          className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                        >
                          <option value="">Selecciona…</option>
                          <option>Defecto de Fabricación</option>
                          <option>Talla Incorrecta</option>
                          <option>Color Diferente</option>
                          <option>Producto Dañado</option>
                          <option>Cliente no Satisfecho</option>
                          <option>Otro</option>
                        </select>
                      </div>

                      <button
                        onClick={addDevolution}
                        className="w-full px-3 py-2 rounded bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm font-medium transition-colors"
                      >
                        Agregar a Devolución
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-3 text-center">Ingrese código y presione Enter</div>
                )}

                {/* Historial de Devoluciones del Turno Actual */}
                <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-4">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Devoluciones del Turno ({returns.filter(r => r.shiftId === activeShift?.id).length})</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {returns.filter(r => r.shiftId === activeShift?.id).slice(0, 10).map(r => {
                      const prod = items.find(i => i.id === r.itemId)
                      return (
                        <div key={r.id} className="text-xs p-2 rounded bg-gray-50 dark:bg-neutral-700/50 text-gray-700 dark:text-gray-300">
                          <div className="font-medium">{prod?.title || 'Producto'}</div>
                          <div>{formatCOP(r.amount)} · {r.reason}</div>
                        </div>
                      )
                    })}
                    {returns.filter(r => r.shiftId === activeShift?.id).length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 p-2 text-center">Sin devoluciones en este turno</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resumen */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1 order-last lg:order-none">
                <h3 className="font-medium mb-3 text-black dark:text-white">Artículos a Devolver</h3>
                
                <div className="space-y-3">
                  {/* Artículos en Devolución */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {devolutionList.map((dev, _idx) => (
                      <div key={dev.id} className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-blue-900 dark:text-blue-300">{dev.itemName}</div>
                            <div className="text-blue-700 dark:text-blue-400 mt-1 uppercase">Talla: <span className="font-semibold">{String(dev.size || 'Sin talla').toUpperCase()}</span></div>
                            <div className="text-blue-700 dark:text-blue-400 mt-1">
                              Reembolso: <span className="font-semibold">{formatCOP(dev.refundAmount)}</span>
                            </div>
                            <div className="text-blue-600 dark:text-blue-500 text-xs mt-1">
                              {dev.reason} · {new Date(dev.purchasedAt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <button
                            onClick={() => removeDevolution(dev.id)}
                            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {devolutionList.length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 text-center p-4">
                        No hay artículos agregados
                      </div>
                    )}
                  </div>

                  {/* Resumen Total */}
                  <div className="border-t border-gray-200 dark:border-neutral-700 pt-3 mt-auto">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Total a Reembolsar:</span>
                      <span className="text-xl font-bold text-black dark:text-white">{formatCOP(totalRefund)}</span>
                    </div>

                    <button
                      onClick={submitDevoluciones}
                      disabled={devolutionList.length === 0}
                      className="w-full px-4 py-3 rounded bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Procesar Devoluciones
                    </button>

                    {devolutionList.length === 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                        Agrega artículos para continuar
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal para ingresar datos del cliente */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
                Datos del Cliente
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Ingresa los datos del cliente que realizará la compra con el valor a favor de la devolución.
              </p>
              
              <div className="space-y-4">
                {/* Tipo de Cliente */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Cliente</label>
                  <select
                    value={customerForm.customer_type}
                    onChange={e => setCustomerForm({...customerForm, customer_type: e.target.value})}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Persona">Persona</option>
                    <option value="Empresa">Empresa</option>
                  </select>
                </div>

                {/* Tipo y Número de Identificación */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo Ident.</label>
                    <select
                      value={customerForm.identification_type}
                      onChange={e => setCustomerForm({...customerForm, identification_type: e.target.value})}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {['NIT', 'CC', 'TI', 'Registro Civil', 'Tarjeta de extranjeria', 'Pasaporte', 'Documento de identificacion de extranjero', 'NUIP', 'PEP', 'Sin identificacion', 'NIT de otro pais', 'PPT', 'Salvaconducto'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Número</label>
                    <input
                      type="text"
                      value={customerForm.customer_id}
                      onChange={e => setCustomerForm({...customerForm, customer_id: e.target.value})}
                      onBlur={handleCustomerIdentificationBlur}
                      placeholder="Identificación"
                      autoFocus
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Nombres y Apellidos - solo para Persona */}
                {customerForm.customer_type === 'Persona' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Primer Nombre</label>
                      <input
                        type="text"
                        value={customerForm.first_name}
                        onChange={e => setCustomerForm({...customerForm, first_name: e.target.value})}
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Segundo Nombre</label>
                      <input
                        type="text"
                        value={customerForm.second_name}
                        onChange={e => setCustomerForm({...customerForm, second_name: e.target.value})}
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Primer Apellido</label>
                      <input
                        type="text"
                        value={customerForm.last_name}
                        onChange={e => setCustomerForm({...customerForm, last_name: e.target.value})}
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Segundo Apellido</label>
                      <input
                        type="text"
                        value={customerForm.second_last_name}
                        onChange={e => setCustomerForm({...customerForm, second_last_name: e.target.value})}
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Correo</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Indicativo y Celular */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Indicativo</label>
                    <input
                      type="text"
                      value={customerForm.phone_indicative}
                      onChange={e => setCustomerForm({...customerForm, phone_indicative: e.target.value})}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Celular</label>
                    <input
                      type="text"
                      value={customerForm.phone_number}
                      onChange={e => setCustomerForm({...customerForm, phone_number: e.target.value})}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 px-4 py-2 rounded bg-gray-300 dark:bg-neutral-600 text-gray-800 dark:text-white font-semibold hover:bg-gray-400 dark:hover:bg-neutral-500 transition-colors disabled:opacity-50"
                  disabled={savingCustomer}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCustomer}
                  disabled={savingCustomer}
                  className="flex-1 px-4 py-2 rounded border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCustomer ? 'Guardando...' : 'Guardar Cliente'}
                </button>
                <button
                  onClick={handleConfirmCustomerAndProceed}
                  className="flex-1 px-4 py-2 rounded bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold transition-colors disabled:opacity-50"
                  disabled={savingCustomer}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
