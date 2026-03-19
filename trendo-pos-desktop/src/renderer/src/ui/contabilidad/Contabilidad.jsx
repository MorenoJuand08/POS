/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useEffect } from 'react'
import { formatCOP } from '@/lib/currency'
import { liveQuery } from 'dexie'
import Header from '../inventario/Layout/Header'
import Footer from '../inventario/Layout/Footer'
import { db, listShifts, listReturns } from '@/services/db'
import * as XLSX from 'xlsx'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

function useLiveShifts() {
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    const sub = liveQuery(() => db.table('shifts').toArray()).subscribe({
      next: v => setData(v)
    })
    return () => sub.unsubscribe()
  }, [])
  return data
}

function useLiveReturns() {
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    const sub = liveQuery(() => listReturns()).subscribe({
      next: v => setData(v)
    })
    return () => sub.unsubscribe()
  }, [])
  return data
}

export default function Contabilidad({ onBack }) {
  const sales = useLiveSales()
  const shifts = useLiveShifts()
  const returns = useLiveReturns()
  const [day, setDay] = useState(() => new Date().toISOString().slice(0,10))
  const [selectedShiftId, setSelectedShiftId] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportShiftId, setExportShiftId] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')

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

  const dayShifts = useMemo(() => {
    return shifts.filter(sh => (sh.opened_at||'').slice(0,10) === day)
  }, [shifts, day])

  const perShiftAggregates = useMemo(() => {
    const map = {}
    for (const sh of dayShifts) {
      map[sh.id] = { shift: sh, total: 0, items: 0, efectivo: 0, transferencia: 0, tarjeta: 0 }
    }
    for (const s of sales) {
      const dkey = (s.created_at||'').slice(0,10)
      if (dkey !== day) continue
      const sid = s.shiftId || ''
      if (sid && map[sid]) {
        map[sid].total += s.total||0
        map[sid].items += s.items||0
        const m = (s.method||'').toLowerCase()
        if (m==='efectivo') map[sid].efectivo += s.total||0
        if (m==='transferencia') map[sid].transferencia += s.total||0
        if (m==='tarjeta') map[sid].tarjeta += s.total||0
      }
    }
    return map
  }, [sales, dayShifts, day])

  const selectedShiftAgg = selectedShiftId ? perShiftAggregates[selectedShiftId] || null : null

  useEffect(() => {
    // Default export shift id to selected shift or first shift of the day
    if (dayShifts.length > 0) {
      setExportShiftId(selectedShiftId || dayShifts[0].id)
    } else {
      setExportShiftId('')
    }
  }, [dayShifts, selectedShiftId])

  // Datos para gráficos
  const paymentMethodsData = useMemo(() => {
    return [
      { name: 'Efectivo', value: selected.efectivo, color: '#3b82f6' },
      { name: 'Transferencia', value: selected.transferencia, color: '#f59e0b' },
      { name: 'Tarjeta', value: selected.tarjeta || 0, color: '#ef4444' }
    ].filter(item => item.value > 0)
  }, [selected])

  const shiftSalesData = useMemo(() => {
    return dayShifts.map(sh => {
      const agg = perShiftAggregates[sh.id] || { total: 0, items: 0 }
      return {
        name: new Date(sh.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        ventas: agg.total,
        prendas: agg.items
      }
    })
  }, [dayShifts, perShiftAggregates])

  const hourlyTrendData = useMemo(() => {
    const hourlyMap = {}
    for (const s of sales) {
      const dkey = (s.created_at || '').slice(0, 10)
      if (dkey !== day) continue
      const hour = new Date(s.created_at).getHours()
      const hourKey = `${hour}:00`
      if (!hourlyMap[hourKey]) {
        hourlyMap[hourKey] = { hour: hourKey, total: 0, cantidad: 0 }
      }
      hourlyMap[hourKey].total += s.total || 0
      hourlyMap[hourKey].cantidad += s.items || 0
    }
    return Object.values(hourlyMap).sort((a, b) => {
      const hourA = parseInt(a.hour.split(':')[0])
      const hourB = parseInt(b.hour.split(':')[0])
      return hourA - hourB
    })
  }, [sales, day])

  function exportShiftAsCSV(agg) {
    const headers = ['Turno','Fecha','Apertura','Inicial','Cierre','Final','Prendas','Total Ventas','Efectivo','Transferencia','Tarjeta','Dif. Caja','Moneda']
    const sh = agg.shift
    const row = [
      (sh.id || '').slice(0,8),
      (sh.opened_at||'').slice(0,10),
      new Date(sh.opened_at).toLocaleTimeString(),
      sh.initialCash||0,
      sh.closed_at ? new Date(sh.closed_at).toLocaleTimeString() : '',
      sh.closed_at ? (sh.finalCash||0) : '',
      agg.items,
      agg.total,
      agg.efectivo,
      agg.transferencia,
      agg.tarjeta,
      sh.closed_at ? ((sh.finalCash||0)-(sh.initialCash||0)) : '',
      'COP'
    ]
    const all = [headers, row]
    const csv = all.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new window.Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_turno_${(sh.opened_at||'').slice(0,10)}_${(sh.id||'').slice(0,6)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  function exportShiftAsXLSX(agg) {
    const sh = agg.shift
    const turnoIdShort = (sh.id||'').slice(0,8)
    const fecha = (sh.opened_at||'').slice(0,10)
    const apertura = new Date(sh.opened_at).toLocaleTimeString()
    const cierre = sh.closed_at ? new Date(sh.closed_at).toLocaleTimeString() : ''
    const inicial = sh.initialCash||0
    const final = sh.closed_at ? (sh.finalCash||0) : ''
    const prendas = agg.items
    const total = agg.total
    const efectivo = agg.efectivo
    const transferencia = agg.transferencia
    const tarjeta = agg.tarjeta
    const difCaja = sh.closed_at ? ((sh.finalCash||0)-(sh.initialCash||0)) : ''

    // Sheet 1: Resumen Turno (columnar, entendible)
    const headerTitle = ['REPORTE DE TURNO TRENDO SAS']
    const headerInfo = [`Fecha: ${fecha}`, `Turno: ${turnoIdShort}`, (sh.userEmail ? `Usuario: ${sh.userEmail}` : '')]
    const tableHeader = ['Apertura','Cierre','Inicial','Final','Prendas','Total Ventas','Efectivo','Transferencia','Tarjeta','Dif. Caja','Moneda']
    const tableRow = [apertura, cierre, inicial, final, prendas, total, efectivo, transferencia, tarjeta, difCaja, 'COP']

    const ws1 = XLSX.utils.aoa_to_sheet([
      headerTitle,
      headerInfo,
      [''],
      tableHeader,
      tableRow
    ])

    // Merge title across columns A..K
    ws1['!merges'] = [{ s: { r:0, c:0 }, e: { r:0, c:10 } }]
    // Column widths
    ws1['!cols'] = [
      { wch: 12 }, // Apertura
      { wch: 12 }, // Cierre
      { wch: 12 }, // Inicial
      { wch: 12 }, // Final
      { wch: 10 }, // Prendas
      { wch: 14 }, // Total
      { wch: 14 }, // Efectivo
      { wch: 16 }, // Transferencia
      { wch: 12 }, // Tarjeta
      { wch: 12 }, // Dif. Caja
      { wch: 8 }   // Moneda
    ]
    // Number formats for money in row 5 (1-based)
    const moneyCols = ['C','D','F','G','H','I','J']
    moneyCols.forEach(col => {
      const cell = ws1[`${col}5`]
      if (cell) cell.z = '#,##0'
    })
    // Prendas numeric format
    if (ws1['E5']) ws1['E5'].z = '0'

    // Sheet 2: Ventas del turno (si hay)
    const ventas = sales.filter(s => (s.shiftId||'') === (sh.id||''))
      .sort((a,b)=> String(a.created_at).localeCompare(String(b.created_at)))
    const ventasHeader = ['Hora','Método','Prendas','Total']
    const ventasRows = ventas.map(v => [new Date(v.created_at).toLocaleTimeString(), v.method || '', v.items || 0, v.total || 0])
    const ws2 = XLSX.utils.aoa_to_sheet([
      [`VENTAS DEL TURNO ${turnoIdShort}`],
      [''],
      ventasHeader,
      ...ventasRows
    ])
    ws2['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:3} }]
    ws2['!cols'] = [ { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 } ]
    // Money format for total column (D)
    for (let i = 4; i < (ventasRows.length + 4); i++) {
      const addr = `D${i}`
      if (ws2[addr]) ws2[addr].z = '#,##0'
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Turno')
    XLSX.utils.book_append_sheet(wb, ws2, 'Ventas')
    XLSX.writeFile(wb, `reporte_turno_${fecha}_${turnoIdShort}.xlsx`)
  }

  function openExportModal() {
    setShowExportModal(true)
  }

  function handleConfirmExport() {
    const agg = perShiftAggregates[exportShiftId]
    if (!agg) { setShowExportModal(false); return }
    if (exportFormat === 'xlsx') exportShiftAsXLSX(agg)
    else exportShiftAsCSV(agg)
    setShowExportModal(false)
  }

  function exportCSV() {
  const headers = ['Fecha','Prendas','Total','Efectivo','Transferencia','Tarjeta','Moneda']
  const row = [selected.day, selected.items, selected.total, selected.efectivo, selected.transferencia, (selected.tarjeta||0), 'COP']
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
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100 overflow-hidden">
      <main className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 dark:text-gray-100">
        <div className="p-6">
        <Header onBack={onBack} title="Contabilidad" showBack={true} />

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Día</label>
              <input type="date" value={day} onChange={e=>setDay(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openExportModal} className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm">Exportar Reporte</button>
            <button onClick={printReport} className="px-3 py-2 rounded bg-black text-white hover:bg-gray-900 text-sm">Imprimir</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total vendido</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.total)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prendas</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{selected.items}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Efectivo</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.efectivo)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transferencia</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.transferencia)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tarjeta</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.tarjeta||0)}</div>
          </div>
        </div>

        {/* Sección de Gráficos */}
        <section className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Análisis Visual</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Métodos de Pago */}
            {paymentMethodsData.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-200 dark:border-neutral-700 shadow-md">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Métodos de Pago</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${formatCOP(entry.value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCOP(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '2px solid #3b82f6', borderRadius: '8px', color: '#000', fontSize: '12px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      labelStyle={{ color: '#1f2937', fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico de Ventas por Turno */}
            {shiftSalesData.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-200 dark:border-neutral-700 shadow-md">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ventas por Turno</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={shiftSalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      formatter={(value) => formatCOP(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '2px solid #3b82f6', borderRadius: '8px', color: '#000', fontSize: '12px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      labelStyle={{ color: '#1f2937', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
                    <Bar dataKey="ventas" fill="#3b82f6" name="Ventas (COP)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico de Tendencia Horaria */}
            {hourlyTrendData.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-200 dark:border-neutral-700 shadow-md lg:col-span-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendencia por Hora</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      formatter={(value) => formatCOP(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '2px solid #10b981', borderRadius: '8px', color: '#000', fontSize: '12px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      labelStyle={{ color: '#1f2937', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#10b981" 
                      name="Ventas (COP)" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Tabla de Resumen Diario */}
        <section className="mb-8 bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-200 dark:border-neutral-700 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumen del día {day}</h3>
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
                  <td className="px-3 py-2 font-medium text-black dark:text-gray-100">{formatCOP(selected.total)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{formatCOP(selected.efectivo)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{formatCOP(selected.transferencia)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{formatCOP(selected.tarjeta||0)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">Sin ventas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {dayShifts.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-semibold mb-3 text-black dark:text-white">Turnos del día</h4>
            <div className="overflow-auto border border-gray-300 dark:border-neutral-700 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-neutral-800 text-black dark:text-gray-200">
                  <tr className="text-left">
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Apertura</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Inicial</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Cierre</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Final</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Prendas</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Total Ventas</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Efectivo</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Transferencia</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Tarjeta</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Dif. Caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                  {dayShifts.map(sh => {
                    const agg = perShiftAggregates[sh.id] || { total:0, items:0, efectivo:0, transferencia:0, tarjeta:0 }
                    const diff = (sh.closed_at ? (sh.finalCash||0)-(sh.initialCash||0) : 0)
                    return (
                      <tr key={sh.id} onClick={()=>setSelectedShiftId(sh.id)} className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700/60 ${selectedShiftId===sh.id?'bg-gray-100 dark:bg-neutral-700/40':''}`}>
                        <td className="px-2 py-1 font-mono">{new Date(sh.opened_at).toLocaleTimeString()}</td>
                        <td className="px-2 py-1">{formatCOP(sh.initialCash||0)}</td>
                        <td className="px-2 py-1 font-mono">{sh.closed_at ? new Date(sh.closed_at).toLocaleTimeString() : '—'}</td>
                        <td className="px-2 py-1">{sh.closed_at ? formatCOP(sh.finalCash||0) : '—'}</td>
                        <td className="px-2 py-1">{agg.items}</td>
                        <td className="px-2 py-1">{formatCOP(agg.total)}</td>
                        <td className="px-2 py-1">{formatCOP(agg.efectivo)}</td>
                        <td className="px-2 py-1">{formatCOP(agg.transferencia)}</td>
                        <td className="px-2 py-1">{formatCOP(agg.tarjeta)}</td>
                        <td className="px-2 py-1">{sh.closed_at ? formatCOP(diff) : '—'}</td>
                      </tr>
                    )
                  })}
                  {dayShifts.length === 0 && (
                    <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">Sin turnos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedShiftAgg && (
          <div className="mt-6 p-4 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <h5 className="text-sm font-semibold mb-4 text-black dark:text-white">Detalle turno seleccionado</h5>
            
            {/* Sección 1: Tiempos */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-neutral-700">
              <h6 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">Horarios</h6>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><div className="text-gray-500 dark:text-gray-400">Apertura</div><div className="font-mono">{new Date(selectedShiftAgg.shift.opened_at).toLocaleTimeString()}</div></div>
                <div><div className="text-gray-500 dark:text-gray-400">Cierre</div><div className="font-mono">{selectedShiftAgg.shift.closed_at ? new Date(selectedShiftAgg.shift.closed_at).toLocaleTimeString() : '—'}</div></div>
              </div>
            </div>

            {/* Sección 2: Efectivo */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-neutral-700">
              <h6 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">Arqueo de Caja</h6>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                  <div className="text-gray-500 dark:text-gray-400">Inicial</div>
                  <div className="font-semibold">{formatCOP(selectedShiftAgg.shift.initialCash||0)}</div>
                </div>
                <div className={`p-2 rounded border ${selectedShiftAgg.shift.closed_at ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-neutral-700 border-gray-200 dark:border-neutral-700'}`}>
                  <div className="text-gray-500 dark:text-gray-400">Conteo Final</div>
                  <div className="font-semibold">{selectedShiftAgg.shift.closed_at ? formatCOP(selectedShiftAgg.shift.finalCash||0) : '—'}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-200 dark:border-purple-800">
                  <div className="text-gray-500 dark:text-gray-400">Esperado</div>
                  <div className="font-semibold">{formatCOP(selectedShiftAgg.shift.expectedCash||0)}</div>
                </div>
                <div className={`p-2 rounded border ${Math.abs(selectedShiftAgg.shift.difference || 0) < 100 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`}>
                  <div className="text-gray-500 dark:text-gray-400">Diferencia</div>
                  <div className={`font-semibold ${selectedShiftAgg.shift.difference > 0 ? 'text-green-600 dark:text-green-400' : selectedShiftAgg.shift.difference < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {formatCOP(selectedShiftAgg.shift.difference||0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Ventas */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-neutral-700">
              <h6 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">Ventas del Turno</h6>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="bg-gray-50 dark:bg-neutral-700 p-2 rounded border border-gray-200 dark:border-neutral-600">
                  <div className="text-gray-500 dark:text-gray-400">Prendas</div>
                  <div className="font-semibold">{selectedShiftAgg.items}</div>
                </div>
                <div className="bg-gray-50 dark:bg-neutral-700 p-2 rounded border border-gray-200 dark:border-neutral-600">
                  <div className="text-gray-500 dark:text-gray-400">Total</div>
                  <div className="font-semibold">{formatCOP(selectedShiftAgg.total)}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                  <div className="text-gray-500 dark:text-gray-400">Efectivo</div>
                  <div className="font-semibold text-green-700 dark:text-green-400">{formatCOP(selectedShiftAgg.efectivo)}</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                  <div className="text-gray-500 dark:text-gray-400">Transferencia</div>
                  <div className="font-semibold text-blue-700 dark:text-blue-400">{formatCOP(selectedShiftAgg.transferencia)}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-200 dark:border-purple-800">
                  <div className="text-gray-500 dark:text-gray-400">Tarjeta</div>
                  <div className="font-semibold text-purple-700 dark:text-purple-400">{formatCOP(selectedShiftAgg.tarjeta)}</div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <button onClick={()=>setSelectedShiftId(null)} className="text-xs px-3 py-1 rounded border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700">Cerrar detalle</button>
            </div>

            {/* Sección de Devoluciones del turno seleccionado */}
            {(() => {
              const shiftReturns = returns.filter(r => r.shiftId === selectedShiftId)
              const totalReturns = shiftReturns.reduce((acc, r) => acc + (r.refund_amount || 0), 0)
              const itemsReturns = shiftReturns.reduce((acc, r) => acc + (r.quantity || 0), 0)
              
              return (
                <div className="mt-6 pt-6 border-t border-gray-300 dark:border-neutral-700">
                  <h6 className="text-sm font-semibold mb-3 text-black dark:text-white">Devoluciones del turno</h6>
                  
                  {shiftReturns.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
                        <div className="border border-gray-300 dark:border-neutral-700 rounded p-2 bg-gray-50 dark:bg-neutral-800">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Total Devoluciones</div>
                          <div className="font-semibold text-black dark:text-white">{formatCOP(totalReturns)}</div>
                        </div>
                        <div className="border border-gray-300 dark:border-neutral-700 rounded p-2 bg-gray-50 dark:bg-neutral-800">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Cantidad de prendas</div>
                          <div className="font-semibold text-black dark:text-white">{itemsReturns}</div>
                        </div>
                        <div className="border border-gray-300 dark:border-neutral-700 rounded p-2 bg-gray-50 dark:bg-neutral-800">
                          <div className="text-gray-500 dark:text-gray-400 text-xs">Total de devoluciones</div>
                          <div className="font-semibold text-black dark:text-white">{shiftReturns.length}</div>
                        </div>
                      </div>

                      <div className="overflow-auto border border-gray-300 dark:border-neutral-700 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-neutral-800 text-black dark:text-gray-200">
                            <tr className="text-left">
                              <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Hora</th>
                              <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Prenda</th>
                              <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Talla</th>
                              <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Cantidad</th>
                              <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Motivo</th>
                              <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Reembolso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                            {shiftReturns.map(ret => (
                              <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700/60">
                                <td className="px-2 py-1 font-mono text-xs">{new Date(ret.created_at || new Date()).toLocaleTimeString()}</td>
                                <td className="px-2 py-1">{ret.product_name || 'N/A'}</td>
                                <td className="px-2 py-1 text-center">{ret.size || '—'}</td>
                                <td className="px-2 py-1 text-center">{ret.quantity || 0}</td>
                                <td className="px-2 py-1 text-xs">{ret.reason || '—'}</td>
                                <td className="px-2 py-1 font-medium text-red-600 dark:text-red-400">{formatCOP(ret.refund_amount || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm border border-gray-300 dark:border-neutral-700 rounded">
                      Sin devoluciones registradas en este turno
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        <div className="mt-auto">
          <Footer compact />
        </div>

        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={()=>setShowExportModal(false)}></div>
            <div className="relative w-full max-w-md rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black dark:text-white">Exportar reporte de turno</h3>
                <button onClick={()=>setShowExportModal(false)} className="text-gray-500 hover:text-black dark:hover:text-white text-sm">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Turno del día {day}</label>
                  <select value={exportShiftId} onChange={e=>setExportShiftId(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-black dark:text-gray-100">
                    {dayShifts.map(sh => (
                      <option key={sh.id} value={sh.id}>
                        {new Date(sh.opened_at).toLocaleTimeString()} {sh.closed_at ? '→ '+new Date(sh.closed_at).toLocaleTimeString() : '(abierto)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Formato</label>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" name="fmt" value="csv" checked={exportFormat==='csv'} onChange={()=>setExportFormat('csv')} /> CSV</label>
                    <label className="flex items-center gap-2"><input type="radio" name="fmt" value="xlsx" checked={exportFormat==='xlsx'} onChange={()=>setExportFormat('xlsx')} /> XLSX</label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={()=>setShowExportModal(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700">Cancelar</button>
                  <button disabled={!exportShiftId} onClick={handleConfirmExport} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">Exportar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}