import { useState, useEffect, useMemo } from 'react'
import { formatCOP } from '@/lib/currency'
import { getActiveShift, closeShift, db } from '@/services/db'

/**
 * Componente de Arqueo (Cierre de Turno)
 * Implementa el concepto de Arqueo Ciego donde el cajero cuenta primero
 * sin saber cuánto "debería" tener según el sistema
 * 
 * Fórmula de cuadratura:
 * Efectivo Esperado = (Base Inicial + Ventas en Efectivo + Ingresos Extra) - (Salidas de Efectivo)
 * Diferencia = Efectivo Real (Ingresado) - Efectivo Esperado (Calculado)
 */
export default function EndShift({ onBack, onNavigate }) {
  const [activeShift, setActiveShift] = useState(null)
  const [step, setStep] = useState('blind-count') // blind-count -> verify -> result
  const [realCashCounted, setRealCashCounted] = useState('')
  const [vouchersTotal, setVouchersTotal] = useState('')
  const [transfersVerified, setTransfersVerified] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState(null)

  // Datos de la venta del día
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    cashSales: 0,
    transferSales: 0,
    cardSales: 0,
    itemsSold: 0,
    returns: 0,
    returnAmount: 0
  })

  useEffect(() => {
    loadShiftData()
    const interval = window.setInterval(loadShiftData, 5000)
    return () => window.clearInterval(interval)
  }, [])

  async function loadShiftData() {
    try {
      const shift = await getActiveShift()
      setActiveShift(shift)

      if (!shift) return

      // Cargar todas las ventas del turno
      const sales = await db
        .table('sales')
        .where('shift_id')
        .equals(shift.id)
        .toArray()

      // Calcular totales
      let totalSales = 0
      let cashSales = 0
      let transferSales = 0
      let cardSales = 0
      let itemsSold = 0

      sales.forEach(sale => {
        totalSales += sale.total || 0
        itemsSold += sale.items || 0

        const method = sale.payment_method || ''
        if (method.includes('Efectivo')) cashSales += sale.total || 0
        else if (method.includes('Transferencia')) transferSales += sale.total || 0
        else if (method.includes('Tarjeta')) cardSales += sale.total || 0
      })

      // Cargar devoluciones
      const returns = await db.table('returns').where('shift_id').equals(shift.id).toArray()
      let returnAmount = 0
      returns.forEach(ret => {
        returnAmount += ret.amount || 0
      })

      setSalesData({
        totalSales,
        cashSales,
        transferSales,
        cardSales,
        itemsSold,
        returns: returns.length,
        returnAmount
      })
    } catch (error) {
      console.error('Error loading shift data:', error)
      showToast('Error cargando datos del turno', 'error')
    }
  }

  // Calcular el efectivo esperado según la fórmula
  const expectedCash = useMemo(() => {
    if (!activeShift) return 0
    const baseInicial = activeShift.initialCash || 0
    const ventasEnEfectivo = salesData.cashSales || 0
    const salidas = salesData.returnAmount || 0
    return baseInicial + ventasEnEfectivo - salidas
  }, [activeShift, salesData])

  // Calcular la diferencia
  const difference = useMemo(() => {
    const real = parseFloat(realCashCounted) || 0
    return real - expectedCash
  }, [realCashCounted, expectedCash])

  // Determinar estado de cuadratura
  const auditStatus = useMemo(() => {
    if (realCashCounted === '') return null
    if (Math.abs(difference) < 1) return 'balanced' // Permitir 1 peso de margen
    return difference > 0 ? 'excess' : 'shortage'
  }, [difference, realCashCounted])

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 3000)
  }

  async function handleSubmitCount() {
    if (!realCashCounted) {
      return showToast('Ingrese el total de efectivo contado', 'error')
    }

    const real = parseFloat(realCashCounted)
    if (isNaN(real) || real < 0) {
      return showToast('Ingrese un monto válido', 'error')
    }

    // En el arqueo ciego, mostramos el resultado sin haberle mostrado antes
    setResult({
      realCounted: real,
      expectedAmount: expectedCash,
      difference: difference,
      status: Math.abs(difference) < 1 ? 'balanced' : difference > 0 ? 'excess' : 'shortage'
    })

    setStep('result')
  }

  async function handleConfirmClose() {
    setLoading(true)
    try {
      const real = parseFloat(realCashCounted)

      // Guardar el cierre del turno
      await closeShift({
        finalCash: real,
        vouchersTotal: parseFloat(vouchersTotal) || 0,
        transfersVerified: parseFloat(transfersVerified) || 0,
        notes: notes,
        expectedCash: expectedCash,
        difference: difference
      })

      showToast('Turno cerrado correctamente', 'success')

      // Generar reporte Z
      await generateZReport({
        realCounted: real,
        expectedAmount: expectedCash,
        difference: difference,
        vouchersTotal: parseFloat(vouchersTotal) || 0,
        transfersVerified: parseFloat(transfersVerified) || 0
      })

      // Volver al menú principal
      window.setTimeout(() => {
        onNavigate('menu')
      }, 2000)
    } catch (error) {
      console.error('Error closing shift:', error)
      showToast('Error al cerrar el turno', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function generateZReport(data) {
    try {
      const timestamp = new Date().toLocaleString('es-CO')
      const reportContent = `
REPORTE Z - CIERRE DE TURNO
===========================
Fecha/Hora: ${timestamp}

ARQUEO DE CAJA
--------------
Efectivo Inicial:        ${formatCOP(activeShift?.initialCash || 0)}
Ventas en Efectivo:      ${formatCOP(salesData.cashSales)}
Ventas por Transferencia: ${formatCOP(salesData.transferSales)}
Ventas por Tarjeta:      ${formatCOP(salesData.cardSales)}
Devoluciones:            -${formatCOP(salesData.returnAmount)}
                         ---
Efectivo Esperado:       ${formatCOP(expectedCash)}

Efectivo Real Contado:   ${formatCOP(data.realCounted)}
                         ---
DIFERENCIA:              ${formatCOP(data.difference)}
Estado:                  ${data.difference === 0 ? 'CAJA CUADRADA ✓' : data.difference > 0 ? 'SOBRANTE' : 'FALTANTE'}

VERIFICACIÓN COMPLEMENTARIA
----------------------------
Vauchers de Datáfono:    ${formatCOP(data.vouchersTotal || 0)}
Transferencias Verificadas: ${formatCOP(data.transfersVerified || 0)}
Notas del Cajero:        ${notes || 'N/A'}

RESUMEN DEL TURNO
-----------------
Total de Ventas:         ${formatCOP(salesData.totalSales)}
Prendas Vendidas:        ${salesData.itemsSold}
Devoluciones:            ${salesData.returns}
`

      // Crear blob para descarga
      const blob = new window.Blob([reportContent], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-z-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // También imprimir
      window.print()
    } catch (error) {
      console.error('Error generating Z report:', error)
    }
  }

  if (!activeShift) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <p className="text-white text-xl mb-4">No hay turno activo para cerrar</p>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg ${
            toast.type === 'error'
              ? 'bg-red-500'
              : toast.type === 'success'
                ? 'bg-green-500'
                : 'bg-blue-500'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Cierre de Turno (Arqueo)</h1>
          <p className="text-gray-300">
            Turno abierto a las {new Date(activeShift.opened_at).toLocaleTimeString('es-CO')}
          </p>
        </div>

        {step === 'blind-count' && (
          <div className="bg-slate-800 rounded-lg p-8 mb-6 border border-slate-700">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-amber-400">
                ⚠️ ARQUEO CIEGO - PASO 1
              </h2>
              <p className="text-gray-300 mb-4">
                Por favor cuente el efectivo en la caja SIN ver cuánto debería tener el sistema.
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Una vez que ingrese el total, el sistema le dirá si le sobró o faltó dinero.
              </p>
            </div>

            {/* Resumen de ventas del día */}
            <div className="bg-slate-700/50 rounded p-4 mb-6 border border-slate-600">
              <h3 className="text-lg font-semibold mb-4">Resumen del Turno</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Total Ventas:</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatCOP(salesData.totalSales)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Prendas Vendidas:</p>
                  <p className="text-xl font-bold">{salesData.itemsSold}</p>
                </div>
                <div>
                  <p className="text-gray-400">Efectivo en Caja (Inicial):</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatCOP(activeShift.initialCash || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Devoluciones:</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatCOP(salesData.returnAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Input de conteo de efectivo */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                Total de Efectivo Contado ($)
              </label>
              <input
                type="number"
                value={realCashCounted}
                onChange={(e) => setRealCashCounted(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded bg-slate-700 border border-slate-600 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-2">
                Ingrese el total exacto de dinero que contó en la caja
              </p>
            </div>

            {/* Botón siguiente */}
            <button
              onClick={handleSubmitCount}
              disabled={!realCashCounted}
              className="w-full px-6 py-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}

        {step === 'result' && result && (
          <div className="bg-slate-800 rounded-lg p-8 mb-6 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              {result.status === 'balanced'
                ? '✓ CAJA CUADRADA'
                : result.status === 'excess'
                  ? '⚠️ SOBRANTE EN CAJA'
                  : '❌ FALTANTE EN CAJA'}
            </h2>

            {/* Resultados del arqueo */}
            <div
              className={`rounded-lg p-6 mb-6 border-2 ${
                result.status === 'balanced'
                  ? 'bg-green-900/30 border-green-500'
                  : result.status === 'excess'
                    ? 'bg-yellow-900/30 border-yellow-500'
                    : 'bg-red-900/30 border-red-500'
              }`}
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-300 text-sm">Efectivo Esperado</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatCOP(result.expectedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Efectivo Contado</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCOP(result.realCounted)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Diferencia</p>
                  <p
                    className={`text-2xl font-bold ${
                      result.status === 'balanced'
                        ? 'text-green-400'
                        : result.status === 'excess'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {formatCOP(result.difference)}
                  </p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-slate-700/50 rounded p-4 mb-6 border border-slate-600">
              <h3 className="text-lg font-semibold mb-4">Verificación Complementaria (Opcional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Total Vauchers de Datáfono ($)
                  </label>
                  <input
                    type="number"
                    value={vouchersTotal}
                    onChange={(e) => setVouchersTotal(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Transferencias Verificadas ($)
                  </label>
                  <input
                    type="number"
                    value={transfersVerified}
                    onChange={(e) => setTransfersVerified(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Notas del Cajero</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Se encontró un billete pegado atrás del mostrador..."
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500 h-16 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep('blind-count')}
                className="flex-1 px-6 py-3 rounded bg-gray-600 text-white font-semibold hover:bg-gray-700"
              >
                ← Volver a Contar
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded font-semibold text-white ${
                  result.status === 'balanced'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Cerrando...' : 'Cerrar Turno y Generar Reporte Z'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
