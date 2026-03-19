import React, { useMemo, useState } from 'react'
import { liveQuery } from 'dexie'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'
import { db } from '@/services/db'

// Minimal hook for real-time Dexie reactivity
function useLiveSales() {
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    const sub = liveQuery(() => db.table('sales').where('deleted').equals(0).toArray()).subscribe({
      next: v => setData(v)
    })
    return () => sub.unsubscribe()
  }, [])
  return data
}

export default function Reportes({ onBack, onLogout, onNavigate }) {
  const sales = useLiveSales()
  const [day, setDay] = useState(() => new Date().toISOString().slice(0,10))

  // Metrics for the selected day only
  const { selected, hasSales } = useMemo(() => {
    const key = day
    const sel = { day: key, total: 0, items: 0, efectivo: 0, transferencia: 0, tarjeta: 0 }
    let any = false
    for (const s of sales) {
      const dkey = (s.created_at || '').slice(0,10)
      if (dkey !== key) continue
      any = true
      sel.total += s.total || 0
      sel.items += s.items || 0
      const m = (s.method || '').toLowerCase()
      if (m === 'efectivo') sel.efectivo += s.total || 0
      if (m === 'transferencia') sel.transferencia += s.total || 0
      if (m === 'tarjeta') sel.tarjeta += s.total || 0
    }
    return { selected: sel, hasSales: any }
  }, [sales, day])

  function exportCSV() {
    const headers = ['Fecha','Prendas','Total','Efectivo','Transferencia','Tarjeta']
    const row = [selected.day, selected.items, selected.total.toFixed(2), selected.efectivo.toFixed(2), selected.transferencia.toFixed(2), (selected.tarjeta||0).toFixed(2)]
    const all = [headers, row]
    const csv = all.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new window.Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${selected.day}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100">
      <Sidebar onNavigate={onNavigate} currentView="reportes" onLogout={onLogout} />
      <main className="flex-1 p-6 bg-white dark:bg-neutral-900 dark:text-gray-100 flex flex-col">
        <Header onBack={onBack} title="Reportes" showBack={true} />

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Día</label>
              <input type="date" value={day} onChange={e=>setDay(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm">Exportar CSV</button>
            <button onClick={printReport} className="px-3 py-2 rounded bg-black text-white hover:bg-gray-900 text-sm">Imprimir</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total vendido</div>
            <div className="text-2xl font-semibold text-black dark:text-white">${selected.total.toFixed(2)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prendas</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{selected.items}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Efectivo</div>
            <div className="text-2xl font-semibold text-black dark:text-white">${selected.efectivo.toFixed(2)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transferencia</div>
            <div className="text-2xl font-semibold text-black dark:text-white">${selected.transferencia.toFixed(2)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tarjeta</div>
            <div className="text-2xl font-semibold text-black dark:text-white">${selected.tarjeta.toFixed(2)}</div>
          </div>
        </div>

        <section className="border border-gray-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800 text-black dark:text-gray-200">
              <tr className="text-left">
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Fecha</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Prendas</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Total</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Efectivo</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Transferencia</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Tarjeta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
              {hasSales ? (
                <tr key={selected.day} className="hover:bg-gray-50 dark:hover:bg-neutral-700/60">
                  <td className="px-3 py-2 text-black dark:text-gray-200 font-mono text-xs">{selected.day}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{selected.items}</td>
                  <td className="px-3 py-2 font-medium text-black dark:text-gray-100">${selected.total.toFixed(2)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">${selected.efectivo.toFixed(2)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">${selected.transferencia.toFixed(2)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">${(selected.tarjeta||0).toFixed(2)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">Sin ventas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="mt-auto">
          <Footer compact />
        </div>
      </main>
    </div>
  )
}
