import { useEffect, useState, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import { listItems, upsertItem, markDeleted, findItemByCode, adjustStockByItem, removeItem } from '@/services/db'
import { formatCOPInput, parseCOP, formatCOP } from '@/lib/currency'
import { onConnectivityChange, syncAll, watchRealtime } from '@/services/sync'
import { insertProductToCloud, deleteProductFromCloud } from '@/services/products'
import { liveQuery } from 'dexie'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'
import ImportProductsModal from './ImportProductsModal'

// Longitud máxima permitida para el código ITEM (SKU)
const MAX_SKU = 15
const SIZES = ['xs', 's', 'm', 'l', 'xl']

function useLiveQuery(queryFn, deps = []) {
  const [data, setData] = useState([])
  useEffect(() => {
    const subscription = liveQuery(queryFn).subscribe({
      next: (value) => setData(value)
    })
    return () => subscription.unsubscribe()
  }, deps)
  return data
}

export default function Inventory({ onBack, onLogout, onNavigate }) {
  const items = useLiveQuery(listItems, [])
  const visibleItems = useMemo(
    () => items.filter(item => !item?.deleted || item.deleted === 0),
    [items]
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newProduct, setNewProduct] = useState({
    item: '',
    title: '',
    price: '', // masked COP string e.g. "12.500"
    xs: '',
    s: '',
    m: '',
    l: '',
    xl: '',
    gender: 'Hombre',
    description: ''
  })
  const [showEditForm, setShowEditForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search] = useState('')
  const [errorAdd, setErrorAdd] = useState('')
  const [errorEdit, setErrorEdit] = useState('')
  // Modal de búsqueda por ITEM
  const [showItemLookup, setShowItemLookup] = useState(false)
  const [itemLookupCode, setItemLookupCode] = useState('')
  const [itemLookupResult, setItemLookupResult] = useState(null)
  const [itemLookupError, setItemLookupError] = useState('')
  const [itemLookupLoading, setItemLookupLoading] = useState(false)
  // Ajuste global de stock
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [adjustSearch, setAdjustSearch] = useState('')
  const [adjustItem, setAdjustItem] = useState('')
  const [adjustItemData, setAdjustItemData] = useState(null)
  const [adjustData, setAdjustData] = useState({ size: '', qty: '', reason: '' })
  const [adjustError, setAdjustError] = useState('')
  // Filtro por género
  const [genderFilter, setGenderFilter] = useState('Todos')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = visibleItems
    
    // Filtrar por género
    if (genderFilter !== 'Todos') {
      result = result.filter(i => (i.gender || i.gender_prod || '').trim() === genderFilter)
    }
    
    // Filtrar por búsqueda
    if (!q) return result
    return result.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.id || '').toLowerCase().includes(q) ||
      (i.item || '').toLowerCase().includes(q)
    )
  }, [visibleItems, search, genderFilter])

  useEffect(() => {
    syncAll()
    const off = watchRealtime()
    // En modo local no ejecutamos sincronizaciones automáticas con la nube
    const id = setInterval(() => { /* sync desactivado */ }, 60_000)
    const offConn = onConnectivityChange(() => { /* sync desactivado en modo local */ })
    return () => { off(); offConn(); clearInterval(id) }
  }, [])

  async function addItem() {
    setShowAddForm(true)
  }

  function openItemLookup() {
    setItemLookupCode('')
    setItemLookupResult(null)
    setItemLookupError('')
    setShowItemLookup(true)
  }

  function openAdjust() {
    setShowAdjustForm(true)
    setAdjustSearch('')
    setAdjustItem('')
    setAdjustItemData(null)
    setAdjustData({ size: '', qty: '', reason: '' })
    setAdjustError('')
  }

  useEffect(() => {
    if (!adjustItem) { setAdjustItemData(null); return }
    const found = items.find(i => i.item === adjustItem)
    setAdjustItemData(found || null)
  }, [adjustItem, items])

  async function submitAdjust(e) {
    e.preventDefault()
    setAdjustError('')
    const code = adjustItem.trim()
    const { size, qty } = adjustData
    if (!code) { setAdjustError('Selecciona un ITEM'); return }
    if (!size) { setAdjustError('Selecciona talla'); return }
    if (!qty) { setAdjustError('Cantidad requerida'); return }
    const delta = parseInt(qty, 10)
    if (isNaN(delta) || delta === 0) { setAdjustError('Cantidad inválida (≠ 0)'); return }
    if (!['xs','s','m','l','xl'].includes(size)) { setAdjustError('Talla inválida'); return }
    const current = (adjustItemData && adjustItemData[size]) || 0
    if (delta < 0 && current + delta < 0) { setAdjustError(`Stock insuficiente en ${size.toUpperCase()} (actual ${current})`); return }
    try {
      await adjustStockByItem(code, size, delta)
      // En modo local no intentamos sincronizar con la nube
      setShowAdjustForm(false)
    } catch {
      setAdjustError('Error al ajustar stock')
    }
  }

  async function performItemLookup(code) {
    const q = (code ?? itemLookupCode).trim()
    setItemLookupError('')
    setItemLookupResult(null)
    if (!q) {
      setItemLookupError('Ingresa un código ITEM')
      return
    }
    if (q.length > MAX_SKU) {
      setItemLookupError(`Máximo ${MAX_SKU} caracteres`)
      return
    }
    setItemLookupLoading(true)
    try {
      const found = await findItemByCode(q)
      if (!found) {
        setItemLookupError('No se encontró el ITEM')
        setItemLookupResult(null)
      } else {
        setItemLookupResult(found)
      }
    } finally {
      setItemLookupLoading(false)
    }
  }

  async function handleSubmit() {
    setErrorAdd('')
    const code = (newProduct.item || '').trim()
    if (!code) {
      setErrorAdd('El ITEM es requerido')
      return
    }
    if (code.length > MAX_SKU) {
      setErrorAdd(`Máximo ${MAX_SKU} caracteres`)
      return
    }
    const existing = await findItemByCode(code)
    if (existing) {
      setErrorAdd('ITEM ya existe, elige otro código')
      return
    }

    const parsedPrice = parseCOP(newProduct.price)
    const normalizedStock = {}
    SIZES.forEach((size) => {
      normalizedStock[size] = Math.max(0, parseInt(newProduct[size], 10) || 0)
    })
    const totalQuantity = SIZES.reduce((sum, size) => sum + normalizedStock[size], 0)

    const baseProduct = {
      id: code,
      item: code,
      title: newProduct.title || 'Nuevo item',
      price: parsedPrice,
      gender: newProduct.gender || 'Hombre',
      description: newProduct.description,
      quantity: totalQuantity,
      deleted: 0,
      ...normalizedStock
    }

    try {
      // ⚠️ MODO LOCAL: Siempre guardar localmente, nunca a Supabase
      await upsertItem({ ...baseProduct, dirty: 1 })
      setShowAddForm(false)
      setNewProduct({
        item: '',
        title: '',
        price: '',
        xs: '',
        s: '',
        m: '',
        l: '',
        xl: '',
        gender: 'Hombre',
        description: ''
      })
    } catch (error) {
      console.error('Error al guardar producto', error)
      const message =
        error?.message?.includes('duplicate') || error?.message?.includes('unique')
          ? 'ITEM ya existe en la base de datos'
          : 'No se pudo guardar el producto en la base de datos'
      setErrorAdd(message)
    }
  }

  async function handleImportProducts(importedProducts) {
    try {
      let successCount = 0
      let errorCount = 0

      for (const product of importedProducts) {
        try {
          const rawCode = product.item ?? product.ITEM ?? product.code ?? product.codigo ?? ''
          const code = String(rawCode).trim()
          if (!code) {
            console.warn('Producto sin ITEM identificado, se omite', product)
            errorCount++
            continue
          }

          const existing = await findItemByCode(code)
          const recordId = existing?.id || code
          const gender = (product.gender || product.gender_prod || existing?.gender || 'Hombre').trim()
          const rawPrice = product.price ?? product.precio ?? existing?.price ?? 0
          const priceNumber = (() => {
            const parsed = typeof rawPrice === 'number' ? rawPrice : parseCOP(String(rawPrice))
            return Number.isFinite(parsed) && parsed > 0 ? parsed : (existing?.price || 0)
          })()

          const normalizeStockValue = value => Math.max(0, parseInt(value, 10) || 0)
          const normalizedStock = {
            xs: normalizeStockValue(product.xs ?? product.stock_xs ?? existing?.xs ?? 0),
            s: normalizeStockValue(product.s ?? product.stock_s ?? existing?.s ?? 0),
            m: normalizeStockValue(product.m ?? product.stock_m ?? existing?.m ?? 0),
            l: normalizeStockValue(product.l ?? product.stock_l ?? existing?.l ?? 0),
            xl: normalizeStockValue(product.xl ?? product.stock_xl ?? existing?.xl ?? 0)
          }
          const totalQuantity = SIZES.reduce((sum, size) => sum + normalizedStock[size], 0)

          const baseProduct = {
            id: recordId,
            item: code,
            title: (product.title || product.nombre || existing?.title || '').toString().trim(),
            description: (product.description || product.descripcion || existing?.description || '').toString(),
            gender,
            price: priceNumber,
            quantity: totalQuantity,
            deleted: 0,
            ...normalizedStock
          }

          await upsertItem({ ...baseProduct, dirty: 1 })
          successCount++
        } catch (err) {
          console.error('Error importando producto:', product.item, err)
          errorCount++
        }
      }

      // En modo local no ejecutamos sincronización con la nube

      setShowImportModal(false)
      // Toast o notificación
      if (successCount > 0) {
        setErrorAdd(`✓ Se importaron ${successCount} producto${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} errores)` : ''}`)
        setTimeout(() => setErrorAdd(''), 3000)
      }
    } catch (error) {
      console.error('Error general en importación:', error)
      setErrorAdd('Error en la importación. Intenta nuevamente.')
    }
  }

  async function openEdit(item) {
    setEditing({
      id: item.id,
      originalItem: item.item || item.id || '',
      title: item.title || '',
      price: typeof item.price === 'number' ? formatCOPInput(item.price) : '',
      xs: item.xs || 0,
      s: item.s || 0,
      m: item.m || 0,
      l: item.l || 0,
      xl: item.xl || 0,
      description: item.description || '',
      gender: item.gender || 'Hombre',
      item: item.item || ''
    })
    setShowEditForm(true)
  }

  async function handleEditSubmit() {
    if (!editing) return
    setErrorEdit('')
    const { id, originalItem, item: editedItem, price, xs, s, m, l, xl, ...rest } = editing
    const code = (editedItem || '').trim()
    if (!code) {
      setErrorEdit('El ITEM es requerido')
      return
    }
    if (code.length > MAX_SKU) {
      setErrorEdit(`Máximo ${MAX_SKU} caracteres`)
      return
    }
    const existing = await findItemByCode(code)
    const originalCodeLower = (originalItem || '').trim().toLowerCase()
    const currentIdLower = (id || '').trim().toLowerCase()
    const isSameRecord = existing && (
      (existing.id && String(existing.id).trim().toLowerCase() === currentIdLower) ||
      (existing.item && String(existing.item).trim().toLowerCase() === originalCodeLower)
    )
    if (existing && !isSameRecord) {
      setErrorEdit('ITEM ya existe, elige otro código')
      return
    }

    const toStock = value => Math.max(0, parseInt(value, 10) || 0)
    const normalizedStock = {
      xs: toStock(xs),
      s: toStock(s),
      m: toStock(m),
      l: toStock(l),
      xl: toStock(xl)
    }
    const totalQuantity = SIZES.reduce((sum, size) => sum + normalizedStock[size], 0)
    const priceNumber = parseCOP(price)
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setErrorEdit('Precio inválido')
      return
    }

    const normalizedCode = code.toLowerCase()
    const hasCodeChanged = originalCodeLower && originalCodeLower !== normalizedCode
    const recordId = hasCodeChanged ? code : (id || code)

    const localRecord = {
      id: recordId,
      item: code,
      title: rest.title || '',
      description: rest.description || '',
      gender: rest.gender || 'Hombre',
      price: priceNumber,
      quantity: totalQuantity,
      deleted: 0,
      ...normalizedStock
    }

    try {
      // ⚠️ MODO LOCAL: Siempre guardar localmente, nunca a Supabase
      await upsertItem({ ...localRecord, dirty: 1 })

      if (hasCodeChanged && id && id !== recordId) {
        await markDeleted(id)
      }

      setShowEditForm(false)
      setEditing(null)
    } catch (error) {
      console.error('Error al actualizar producto', error)
      setErrorEdit(error?.message || 'No se pudo actualizar el producto')
    }
  }

  

  async function deleteItem(item) {
    const label = item.title || item.item || (item.id ? item.id.slice(0,8) : '')
    const ok = window.confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)
    if (!ok) return

    const productKey = item.item || item.id

    if (!productKey) {
      console.error('Intento de eliminar sin ID válido', item)
      return
    }

    try {
      if (navigator.onLine) {
        const result = await deleteProductFromCloud(productKey)
        if (result?.success === false) {
          throw new Error(result.error || 'Supabase rechazó la eliminación')
        }
        await removeItem(item.id)
        await syncAll()
      } else {
        await markDeleted(item.id)
      }
    } catch (error) {
      console.error('Error al eliminar producto', error)
      try {
        await markDeleted(item.id)
        window.alert('No se pudo eliminar el producto en la nube. Se eliminará cuando vuelva la conexión.')
      } catch (markError) {
        console.error('No se pudo marcar para eliminación local', markError)
        window.alert('Error eliminando producto. Intenta nuevamente.')
      }
    }
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100 overflow-hidden">
      <Sidebar onNavigate={onNavigate} currentView="inventory" onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 dark:text-gray-100">
        <div className="p-6">
        <Header onBack={onBack} title="Productos" showBack={true} />

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3 max-w-3xl">
            <button
              onClick={openItemLookup}
              className="px-3 py-2 text-sm rounded-md border border-gray-600 dark:border-neutral-600 bg-black dark:bg-neutral-800 text-white dark:text-gray-100 hover:bg-gray-500 dark:hover:bg-neutral-700"
              title="Buscar existencias por ITEM"
            >
              Buscar por ITEM
            </button>
            <button
              onClick={openAdjust}
              className="px-3 py-2 text-sm rounded-md border border-blue-500 dark:border-blue-400 bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
              title="Ajustar stock de un ITEM"
            >
              Editar ITEM
            </button>

          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">Gestiona el catálogo de productos de la tienda</div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 text-sm rounded-md border border-gray-400 hover:bg-green-600 bg-white text-gray-700 hover:text-white items-center gap-2"
                title="Importar productos desde Excel"
              >
                📥 Importar Excel
              </button>
              <button
                onClick={addItem}
                className="px-4 py-2 text-sm rounded-md bg-black text-white hover:bg-gray-900 flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span>
                Agregar Producto
              </button>
            </div>
          </div>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-neutral-700 transition-colors">
              <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Agregar Nuevo Producto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ITEM</label>
                  <input
                    type="text"
                    value={newProduct.item}
                    onChange={(e) => setNewProduct({...newProduct, item: e.target.value})}
                    maxLength={MAX_SKU}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    placeholder="Código único (ej. SKU)"
                  />
                  {errorAdd && <div className="mt-1 text-xs text-red-600">{errorAdd}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-gray-200">Nombre del Producto</label>
                  <input
                    type="text"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-[#a6a6a6] dark:border-neutral-600 shadow-sm focus:border-[#a6a6a6] focus:ring-[#a6a6a6] bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Género</label>
                  <select
                    value={newProduct.gender}
                    onChange={e => setNewProduct({ ...newProduct, gender: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                  >
                    <option>Hombre</option>
                    <option>Mujer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock por talla</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['xs','s','m','l','xl'].map(size => (
                      <input
                        key={size}
                        type="number"
                        min="0"
                        value={newProduct[size] || ''}
                        onChange={e => {
                          const raw = e.target.value
                          if (raw === '') {
                            setNewProduct({ ...newProduct, [size]: '' })
                            return
                          }
                          let n = parseInt(raw, 10)
                          if (isNaN(n) || n < 0) n = 0
                          setNewProduct({ ...newProduct, [size]: String(n) })
                        }}
                        placeholder={size.toUpperCase()}
                        className="w-full rounded-md border border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1 text-sm bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio (COP)</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">COP</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newProduct.price}
                      onChange={(e) => {
                        const masked = formatCOPInput(e.target.value)
                        setNewProduct({...newProduct, price: masked })
                      }}
                      placeholder="Ej: 120.000"
                      className="pl-10 mt-1 block w-full rounded-md border border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">Escriba solo números; se aplican separadores automáticamente.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    rows="3"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-neutral-700 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="flex-1 min-h-0">
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 flex flex-col h-full">
            {/* Filtros de género */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-700 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filtrar por:</span>
              <div className="flex gap-2">
                {['Todos', 'Hombre', 'Mujer'].map(gender => (
                  <button
                    key={gender}
                    onClick={() => setGenderFilter(gender)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      genderFilter === gender
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
              {filtered.length > 0 && (
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="max-h-[69vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 sticky top-0 z-10">
                     <tr className="text-left">
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-24">ITEM</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Nombre</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-24">Género</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">XS</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">S</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">M</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">L</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">XL</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-24">Total</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-28">VALOR</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-24">IVA (19%)</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-32">Estado</th>
                       <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-32">Acciones</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                     {filtered.map(item => {
                      const normalizedSizes = SIZES.reduce((acc, size) => {
                        const raw = item[size] ?? item[`stock_${size}`] ?? 0
                        const parsed = Number.parseInt(raw, 10)
                        acc[size] = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
                        return acc
                      }, {})
                      const totalQuantity =
                        Number.isFinite(item.quantity) && item.quantity >= 0
                          ? item.quantity
                          : SIZES.reduce((sum, size) => sum + normalizedSizes[size], 0)

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300 text-xs font-mono">{item.item || item.id.slice(0,8)}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-sm text-black dark:text-gray-100">{item.title}</div>
                            {item.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>}
                          </td>
                          <td className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                                 {(item.gender_prod || item.gender || '').trim()}
                          </td>
                          {SIZES.map(size => (
                            <td key={size} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                              {normalizedSizes[size]}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 font-medium">{totalQuantity}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{typeof item.price === 'number' ? formatCOP(item.price) : '—'}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{typeof item.price === 'number' ? formatCOP(Math.round(item.price * 0.19)) : '—'}</td>
                          <td className="px-3 py-2">
                            {item.dirty ? (
                              <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700">Pendiente</span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">OK</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(item)}
                                title="Editar"
                                aria-label="Editar"
                                className="w-8 h-8 rounded border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                              </button>
                              <button
                                onClick={() => deleteItem(item)}
                                title="Eliminar"
                                aria-label="Eliminar"
                                className="w-8 h-8 rounded border border-red-200 dark:border-red-400/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                     {filtered.length === 0 && (
                       <tr>
                         <td colSpan={13} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">Sin productos</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>
            </div>
          </div>
        </section>

        {showItemLookup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-[28rem] shadow-xl border border-gray-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Buscar por ITEM</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código ITEM</label>
                  <input
                    autoFocus
                    type="text"
                    value={itemLookupCode}
                    onChange={e => { setItemLookupCode(e.target.value); setItemLookupError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') performItemLookup() }}
                    maxLength={MAX_SKU}
                    placeholder="Ej. SKU-123"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 px-3 py-2 text-sm"
                  />
                  {itemLookupError && <div className="mt-1 text-xs text-red-500">{itemLookupError}</div>}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowItemLookup(false)}
                    className="px-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-neutral-600"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => performItemLookup()}
                    disabled={itemLookupLoading}
                    className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {itemLookupLoading ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>

                {itemLookupResult && (
                  <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-4">
                    <div className="mb-3">
                      <div className="text-sm font-medium text-black dark:text-white">{itemLookupResult.title || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">ITEM: <span className="font-mono">{itemLookupResult.item}</span> • {itemLookupResult.gender || 'Hombre'}</div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {['xs','s','m','l','xl'].map(sz => {
                        const qty = itemLookupResult[sz] || 0
                        return (
                          <div key={sz} className="p-3 rounded-md border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700/40 text-center">
                            <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-300">{sz}</div>
                            <div className="text-lg font-semibold text-black dark:text-white">{qty}</div>
                            {qty === 0 && <div className="text-[10px] text-red-500 mt-1">Sin stock</div>}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">Total: <span className="font-semibold">{itemLookupResult.quantity || 0}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showEditForm && editing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Editar Producto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ITEM</label>
                  <input
                    type="text"
                    value={editing.item}
                    onChange={e => setEditing({ ...editing, item: e.target.value })}
                    maxLength={MAX_SKU}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    placeholder="Código único"
                  />
                  {errorEdit && <div className="mt-1 text-xs text-red-500">{errorEdit}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-gray-200">Nombre del Producto</label>
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-[#a6a6a6] dark:border-neutral-600 shadow-sm focus:border-[#a6a6a6] focus:ring-[#a6a6a6] bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Género</label>
                  <select
                    value={editing.gender}
                    onChange={e => setEditing({ ...editing, gender: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                  >
                    <option>Hombre</option>
                    <option>Mujer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock por talla</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['xs','s','m','l','xl'].map(size => (
                      <input
                        key={size}
                        type="number"
                        min="0"
                        value={typeof editing[size] === 'number' ? editing[size] : (parseInt(editing[size]) || 0)}
                        onChange={e => {
                          const raw = e.target.value
                          if (raw === '') {
                            setEditing({ ...editing, [size]: 0 })
                            return
                          }
                          let n = parseInt(raw, 10)
                          if (isNaN(n) || n < 0) n = 0
                          setEditing({ ...editing, [size]: n })
                        }}
                        placeholder={size.toUpperCase()}
                        className="w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1 text-sm bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio (COP)</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">COP</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editing.price}
                      onChange={(e) => {
                        const masked = formatCOPInput(e.target.value)
                        setEditing({ ...editing, price: masked })
                      }}
                      onFocus={(e)=> e.target.select()}
                      placeholder="Ej: 85.000"
                      className="pl-10 mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">Puede borrar todo el valor y escribir de nuevo. Solo números, se formatea automáticamente.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <textarea
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    rows="3"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => { setShowEditForm(false); setEditing(null) }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-neutral-700 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAdjustForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <form
              onSubmit={submitAdjust}
              className="bg-white dark:bg-neutral-800 w-full max-w-md rounded-lg border border-gray-200 dark:border-neutral-700 p-6 shadow-xl space-y-4"
            >
              <h3 className="text-lg font-semibold text-black dark:text-white">Editar ITEM (Ajustar Stock)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar producto</label>
                <input
                  type="text"
                  value={adjustSearch}
                  onChange={e => setAdjustSearch(e.target.value)}
                  placeholder="Buscar por nombre o ITEM"
                  className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                  autoFocus
                />
                <select
                  value={adjustItem}
                  onChange={e => setAdjustItem(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                >
                  <option value="">Selecciona…</option>
                  {items
                    .filter(it => {
                      const q = adjustSearch.trim().toLowerCase()
                      if (!q) return true
                      return (it.title||'').toLowerCase().includes(q) || (it.item||'').toLowerCase().includes(q)
                    })
                    .slice(0, 200)
                    .map(it => (
                      <option key={it.id} value={it.item || ''}>
                        {(it.title || '—')} ({it.item || it.id.slice(0,8)})
                      </option>
                    ))}
                </select>
              </div>
              {adjustItemData && (
                <div className="text-xs text-gray-600 dark:text-gray-300 border rounded p-2 bg-gray-50 dark:bg-neutral-700/40">
                  <div className="font-semibold text-black dark:text-white mb-1">{adjustItemData.title || '—'}</div>
                  <div className="flex flex-wrap gap-2">
                    {['xs','s','m','l','xl'].map(sz => (
                      <div key={sz} className="px-2 py-1 rounded border border-gray-200 dark:border-neutral-600 text-[10px] flex flex-col items-center">
                        <span className="uppercase text-gray-500 dark:text-gray-300">{sz}</span>
                        <span className="font-semibold text-black dark:text-white">{adjustItemData[sz] || 0}</span>
                      </div>
                    ))}
                    <div className="px-2 py-1 rounded border border-gray-200 dark:border-neutral-600 text-[10px] flex flex-col items-center">
                      <span className="uppercase text-gray-500 dark:text-gray-300">Total</span>
                      <span className="font-semibold text-black dark:text-white">{adjustItemData.quantity || 0}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Talla</label>
                  <select
                    value={adjustData.size}
                    onChange={e => setAdjustData(d => ({ ...d, size: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                  >
                    <option value="">Selecciona</option>
                    <option value="xs">XS</option>
                    <option value="s">S</option>
                    <option value="m">M</option>
                    <option value="l">L</option>
                    <option value="xl">XL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad (+ / -)</label>
                  <input
                    type="number"
                    value={adjustData.qty}
                    onChange={e => setAdjustData(d => ({ ...d, qty: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                    placeholder="Ej: 5 o -2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo (opcional)</label>
                <input
                  type="text"
                  value={adjustData.reason}
                  onChange={e => setAdjustData(d => ({ ...d, reason: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                  placeholder="Ingreso, corrección, merma…"
                />
              </div>
              {adjustError && <div className="text-xs text-red-600">{adjustError}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustForm(false)}
                  className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        )}

        <ImportProductsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportProducts}
        />

        <div className="mt-auto">
          <Footer compact />
        </div>
        </div>
      </main>
    </div>
  )
}
