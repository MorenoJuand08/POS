import React from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/services/db'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'
import * as XLSX from 'xlsx'
import { formatCOP } from '@/lib/currency'

export default function ControlStock({ onBack, onLogout, onNavigate }) {
  const [items, setItems] = React.useState([])
  const [genderFilter, setGenderFilter] = React.useState('Todos')
  const [exportFormat, setExportFormat] = React.useState('xlsx')
  // Ajustar stock modal removido
  // Ajuste de stock movido a sección Productos (Inventory), se eliminan estados locales relacionados
  const STOCK_MIN_DEFAULT = 5
  React.useEffect(() => {
    const sub = liveQuery(() => db.table('items').where('deleted').equals(0).toArray()).subscribe({
      next: v => setItems(v)
    })
    return () => sub.unsubscribe()
  }, [])

  const totals = React.useMemo(() => {
    let stockTotal = 0
    let disponibles = 0
    let bajos = 0
    let sin = 0
    for (const it of items) {
      const qty = it.quantity || 0
      stockTotal += qty
      if (qty === 0) sin += 1
      else {
        disponibles += 1
        if (qty <= 2) bajos += 1
      }
    }
    return { stockTotal, disponibles, bajos, sin }
  }, [items])

  const processed = React.useMemo(() => {
    const gf = genderFilter
    return items
      .filter(it => {
        if (gf !== 'Todos' && (it.gender || 'Unisex') !== gf) return false
        return true
      })
      .map(it => {
        const qty = it.quantity || 0
        const min = STOCK_MIN_DEFAULT
        let estado = 'Disponible'
        if (qty === 0) estado = 'Agotado'
        else if (qty <= min) estado = 'Bajo stock'
        return { ...it, qty, min, estado }
      })
  }, [items, genderFilter])

  // Construir filas para exportación
  const buildRows = React.useCallback(() => {
    return processed.map(r => ({
      ITEM: r.item || r.id.slice(0, 8),
      Nombre: r.title || '',
      Genero: r.gender || 'Unisex',
      StockActual: r.qty,
      StockMinimo: r.min,
      Estado: r.estado,
      Moneda: 'COP'
    }))
  }, [processed])

  function exportCSV() {
    const rows = buildRows()
  const headers = Object.keys(rows[0] || { ITEM: '', Nombre: '', Genero: '', StockActual: '', StockMinimo: '', Estado: '', Moneda: '' })
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => String(r[h]).replace(/"/g, '""')).join(','))
    ].join('\n')
  const blob = new window.Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
  const url = window.URL.createObjectURL(blob)
    const fecha = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `stock_${fecha}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
  }

  function exportXLSX() {
    const rows = buildRows()
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stock')
    const fecha = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `stock_${fecha}.xlsx`)
  }

  function handleExportReporte() {
    if (!processed.length) return
    if (exportFormat === 'xlsx') exportXLSX()
    else exportCSV()
  }

  // submitAdjust eliminado (funcionalidad trasladada a Inventory)

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100 overflow-hidden">
      <Sidebar onNavigate={onNavigate} currentView="controlStock" onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 dark:text-gray-100">
        <div className="p-6">
        <Header onBack={onBack} title="Control de Stock" />
        
        <section>
          <div className="border border-[#a6a6a6] dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-800">
            <h3 className="text-xl font-semibold mb-6 text-black dark:text-white">Control de Stock</h3>
            
            <div className="space-y-6">
              {/* Estadísticas Generales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stock Total */}
                <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-4 rounded-lg flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gray-100 dark:bg-neutral-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-black dark:text-white" aria-hidden="true">
                      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 8v9l9 5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 8v9l-9 5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 13v9" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400">Stock Total</h4>
                    <p className="text-2xl font-semibold text-black dark:text-white">{totals.stockTotal}</p>
                  </div>
                </div>

                {/* Disponibles */}
                <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-4 rounded-lg flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-green-600" aria-hidden="true">
                      <path d="M3 17l6-6 4 4 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400">Disponibles</h4>
                    <p className="text-2xl font-semibold text-black dark:text-white">{totals.disponibles}</p>
                  </div>
                </div>

                {/* Bajo Stock */}
                <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-4 rounded-lg flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-yellow-100 dark:bg-amber-900/30">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-amber-500" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400">Bajo Stock</h4>
                    <p className="text-2xl font-semibold text-black dark:text-white">{totals.bajos}</p>
                  </div>
                </div>

                {/* Agotados */}
                <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-4 rounded-lg flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-red-600" aria-hidden="true">
                      <line x1="8" y1="8" x2="16" y2="16"/>
                      <line x1="16" y1="8" x2="8" y2="16"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 dark:text-gray-400">Agotados</h4>
                    <p className="text-2xl font-semibold text-black dark:text-white">{totals.sin}</p>
                  </div>
                </div>
              </div>

              {/* Tabla de Productos con filtros */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-[#a6a6a6] dark:border-neutral-700">
                <div className="p-4 border-b border-[#a6a6a6] dark:border-neutral-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h4 className="font-medium text-black dark:text-white">Inventario Detallado</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Género:</label>
                      <select
                        value={genderFilter}
                        onChange={e => setGenderFilter(e.target.value)}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-700 text-sm text-gray-700 dark:text-gray-200"
                      >
                        <option>Todos</option>
                        <option>Hombre</option>
                        <option>Mujer</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200">
                      <tr className="text-left">
                        <th className="px-3 py-2 border-b">ITEM</th>
                        <th className="px-3 py-2 border-b">Nombre</th>
                        <th className="px-3 py-2 border-b">Género</th>
                        <th className="px-3 py-2 border-b">Stock Actual</th>
                        <th className="px-3 py-2 border-b">Precio</th>
                        <th className="px-3 py-2 border-b">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                      {processed.map(it => (
                        <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                          <td className="px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-300">{it.item || it.id.slice(0,8)}</td>
                          <td className="px-3 py-2 text-black dark:text-gray-100">{it.title || '—'}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 text-xs">{it.gender || 'Unisex'}</td>
                          <td className="px-3 py-2 text-black dark:text-gray-100 font-medium">{it.qty}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{typeof it.price === 'number' ? formatCOP(it.price) : '—'}</td>
                          <td className="px-3 py-2">
                            {it.estado === 'Disponible' && (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Disponible</span>
                            )}
                            {it.estado === 'Bajo stock' && (
                              <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700">Bajo stock</span>
                            )}
                            {it.estado === 'Agotado' && (
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Agotado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {processed.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">Sin resultados</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <select
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value)}
                    className="px-2 py-2 rounded border border-[#a6a6a6] dark:border-neutral-700 bg-white dark:bg-neutral-700 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                  </select>
                  <button
                    onClick={handleExportReporte}
                    className="px-4 py-2 border border-[#a6a6a6] dark:border-neutral-700 text-black dark:text-gray-200 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Exportar
                  </button>
                </div>
                {/* Botón Ajustar Stock eliminado: funcionalidad movida a Productos */}
              </div>
            </div>
          </div>
        </section>
        {/* Modal de ajuste eliminado */}

        <div className="mt-auto">
          <Footer compact />
        </div>
        </div>
      </main>
    </div>
  )
}