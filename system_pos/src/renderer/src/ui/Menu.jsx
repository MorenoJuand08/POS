import { useEffect, useState } from 'react'
import { openShift, closeShift, getActiveShift, db } from '@/services/db'
import { formatCOP, formatCOPInput, parseCOP } from '@/lib/currency'

export default function Menu({ onGoInventory, onGoCash, onGoContabilidad, onGoConfiguracion, onLogout, user }) {
  const [activeShift, setActiveShift] = useState(null)
  const [loadingShift, setLoadingShift] = useState(false)
  const [initialCashInput, setInitialCashInput] = useState('')
  const [errorShift, setErrorShift] = useState('')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftStep, setShiftStep] = useState('menu') // 'menu', 'blind-count', 'summary'
  
  // Estado para cierre de turno (arqueo)
  const [blindCountInput, setBlindCountInput] = useState('')
  const [shiftSummary, setShiftSummary] = useState(null)


  useEffect(() => {
    refreshShift()
  }, [])

  async function refreshShift() {
    const s = await getActiveShift()
    setActiveShift(s || null)
  }

  async function handleOpenShift() {
    setErrorShift('')
    setLoadingShift(true)
    try {
  const cash = parseCOP(initialCashInput) || 0
      await openShift({ userEmail: user?.email, initialCash: cash })
      setInitialCashInput('')
      await refreshShift()
    } catch (e) {
      setErrorShift(e.message || 'Error abriendo turno')
    } finally {
      setLoadingShift(false)
    }
  }

  async function handleBlindCountSubmit() {
    const blindCount = parseCOP(blindCountInput) || 0
    if (blindCount === 0) {
      setErrorShift('Ingresa el monto que contaste')
      return
    }
    
    setErrorShift('')
    setLoadingShift(true)
    
    try {
      // Calcular el resumen final
      const active = activeShift
      if (!active) {
        setErrorShift('No hay turno activo')
        return
      }
      
      // Obtener datos de ventas
      const sales = await db
        .table('sales')
        .where('shiftId')
        .equals(active.id)
        .toArray()
      
      let cashSales = 0
      let debitSales = 0
      let creditSales = 0
      let otherSales = 0
      
      sales.forEach(sale => {
        const method = (sale.payment_method || sale.method || '').toLowerCase()
        const total = sale.total || 0
        if (method.includes('efectivo')) {
          cashSales += total
        } else if (method.includes('débito') || method.includes('debito')) {
          debitSales += total
        } else if (method.includes('crédito') || method.includes('credito')) {
          creditSales += total
        } else if (method.includes('transferencia')) {
          otherSales += total
        }
      })
      
      // Obtener devoluciones
      const returns = await db.table('returns').where('shiftId').equals(active.id).toArray()
      let returnAmount = 0
      returns.forEach(ret => {
        returnAmount += ret.amount || 0
      })
      
      // Fórmula: Efectivo Esperado = (Base Inicial + Ventas en Efectivo) - Devoluciones
      const expectedCash = (active.initialCash || 0) + cashSales - returnAmount
      const difference = blindCount - expectedCash
      
      // Crear resumen
      const summary = {
        blindCount,
        expectedCash,
        difference,
        debitSales,
        creditSales,
        otherSales,
        cashSales,
        returnAmount,
        initialCash: active.initialCash || 0,
        status: Math.abs(difference) < 100 ? 'balanced' : difference > 0 ? 'overage' : 'shortage'
      }
      
      setShiftSummary(summary)
      setShiftStep('summary')
    } catch (e) {
      setErrorShift(e.message || 'Error procesando arqueo')
    } finally {
      setLoadingShift(false)
    }
  }

  async function handleConfirmCloseShift() {
    if (!shiftSummary) return
    
    setLoadingShift(true)
    try {
      await closeShift({
        finalCash: shiftSummary.blindCount,
        expectedCash: shiftSummary.expectedCash,
        difference: shiftSummary.difference,
        vouchersTotal: shiftSummary.debitSales + shiftSummary.creditSales,
        transfersVerified: shiftSummary.otherSales,
        notes: `Arqueo: ${shiftSummary.status}`
      })
      
      setBlindCountInput('')
      setShiftStep('menu')
      setShiftSummary(null)
      await refreshShift()
      setShowShiftModal(false)
    } catch (e) {
      setErrorShift(e.message || 'Error cerrando turno')
    } finally {
      setLoadingShift(false)
    }
  }

  return (
    <main className="min-h-screen p-8 flex flex-col">
      <div className="flex items-center justify-between mb-6">
      </div>

      {/* Tarjeta TURNO */}
      <div className="max-w-3xl mx-auto mb-8 w-full">
        <div className="rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600">
              {/* Ticket icon with state color: green (abrir) / blue (abierto) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-7 h-7 ${!activeShift ? 'text-green-600' : 'text-blue-600'}`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 6c0-1.105.895-2 2-2h12a2 2 0 0 1 2 2v2.25a2.75 2.75 0 0 0 0 5.5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.25a2.75 2.75 0 0 0 0-5.5V6z"/>
                <rect x="8.5" y="7.5" width="7" height="9" rx="1.25" ry="1.25" fill="white" opacity=".2"/>
                <path d="M10 9.25c.414 0 .75.336.75.75v4a.75.75 0 1 1-1.5 0v-4c0-.414.336-.75.75-.75zm4 0c.414 0 .75.336.75.75v4a.75.75 0 1 1-1.5 0v-4c0-.414.336-.75.75-.75z" fill="currentColor"/>
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-black dark:text-white">Turno de Caja</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">{!activeShift ? 'No hay turno abierto actualmente' : 'Turno activo desde la hora indicada'}</p>
              {activeShift && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-600 dark:text-gray-400 pt-1">
                  <div><span className="font-medium">Apertura:</span> {new Date(activeShift.opened_at).toLocaleTimeString()}</div>
                  <div><span className="font-medium">Inicial:</span> {activeShift.initialCash.toLocaleString('es-CO')}</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeShift && !activeShift.closed_at && (
              <span className="px-2 py-1 rounded text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Abierto</span>
            )}
            <button
              onClick={() => { 
                setErrorShift('')
                setShiftStep('menu')
                setBlindCountInput('')
                setShiftSummary(null)
                setShowShiftModal(true)
              }}
              className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60"
            >
              {activeShift ? 'Cerrar turno' : 'Abrir turno'}
            </button>
          </div>
        </div>
      </div>

      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loadingShift && setShowShiftModal(false)}></div>
          <div className="relative w-full max-w-md rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">
                {shiftStep === 'menu' ? (activeShift ? 'Cerrar turno' : 'Abrir turno') : 'Arqueo de Caja'}
              </h3>
              <button disabled={loadingShift} onClick={() => { setShowShiftModal(false); setShiftStep('menu'); }} className="text-gray-500 hover:text-black dark:hover:text-white text-sm">✕</button>
            </div>
            
            {/* ABRIR TURNO */}
            {!activeShift && shiftStep === 'menu' ? (
              <div className="space-y-5">
                <div className="text-sm text-gray-700 dark:text-gray-300">Empresa: <span className="font-semibold">TRENDO SAS</span></div>
                {user?.email && (
                  <div className="text-sm text-gray-700 dark:text-gray-300">Usuario: <span className="font-mono">{user.email}</span></div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto inicial (COP)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={initialCashInput}
                    onChange={e => setInitialCashInput(formatCOPInput(e.target.value))}
                    placeholder="Ej: 200.000"
                    className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-black dark:text-gray-100"
                  />
                </div>
                {errorShift && <div className="text-xs text-red-600">{errorShift}</div>}
                <div className="flex justify-end gap-3 pt-2">
                  <button disabled={loadingShift} onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700">Cancelar</button>
                  <button
                    disabled={loadingShift}
                    onClick={async () => { await handleOpenShift(); if(!errorShift) setShowShiftModal(false); }}
                    className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60"
                  >{loadingShift ? 'Abriendo…' : 'Confirmar'}</button>
                </div>
              </div>
            ) : activeShift && activeShift.closed_at && shiftStep === 'menu' ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Cierre</div>
                    <div className="font-semibold text-black dark:text-white">{new Date(activeShift.closed_at).toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Final</div>
                    <div className="font-semibold text-black dark:text-white">{formatCOP(activeShift.finalCash || 0)}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Turno ya fue cerrado.</div>
                <div className="flex justify-end pt-2">
                  <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200">Cerrar</button>
                </div>
              </div>
            ) : activeShift && !activeShift.closed_at ? (
              <>
                {/* FORMULARIO DE CIERRE - PASO ÚNICO */}
                {shiftStep === 'menu' && (
                  <div className="space-y-5">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm text-blue-700 dark:text-blue-300">
                      <strong>Arqueo de Caja</strong><br/>
                      <span className="text-xs">Ingresa el efectivo contado. Los otros valores se calculan automáticamente.</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Apertura</div>
                        <div className="font-semibold text-black dark:text-white">{new Date(activeShift.opened_at).toLocaleTimeString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Inicial</div>
                        <div className="font-semibold text-black dark:text-white">{formatCOP(activeShift.initialCash || 0)}</div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Efectivo contado (COP)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={blindCountInput}
                        onChange={e => setBlindCountInput(formatCOPInput(e.target.value))}
                        placeholder="Ej: 540.000"
                        autoFocus
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-black dark:text-gray-100 font-semibold"
                      />
                    </div>
                    
                    {errorShift && <div className="text-xs text-red-600">{errorShift}</div>}
                    <div className="flex justify-end gap-3 pt-2">
                      <button disabled={loadingShift} onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700">Cancelar</button>
                      <button
                        disabled={loadingShift}
                        onClick={handleBlindCountSubmit}
                        className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                      >{loadingShift ? 'Calculando…' : 'Calcular Arqueo'}</button>
                    </div>
                  </div>
                )}
                
                {/* RESUMEN Y CONFIRMACIÓN */}
                {shiftStep === 'summary' && shiftSummary && (
                  <div className="space-y-5">
                    <div className={`rounded p-3 text-xs ${
                      shiftSummary.status === 'balanced' 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                        : shiftSummary.status === 'overage'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}>
                      <strong>Resultado del Arqueo:</strong> {
                        shiftSummary.status === 'balanced' ? '✓ ¡Caja Cuadrada!' :
                        shiftSummary.status === 'overage' ? '⚠ Sobrante' :
                        '⚠ Faltante'
                      }
                    </div>
                    
                    <div className="space-y-3">
                      <div className="border border-gray-200 dark:border-neutral-700 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">SISTEMA</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Inicial:</span>
                            <span className="font-semibold">{formatCOP(shiftSummary.initialCash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>+ Ventas Efectivo:</span>
                            <span className="font-semibold">{formatCOP(shiftSummary.cashSales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>- Devoluciones:</span>
                            <span className="font-semibold">-{formatCOP(shiftSummary.returnAmount)}</span>
                          </div>
                          <div className="border-t border-gray-200 dark:border-neutral-700 pt-1 mt-1 flex justify-between font-semibold">
                            <span>Esperado:</span>
                            <span className="text-blue-600 dark:text-blue-400">{formatCOP(shiftSummary.expectedCash)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 dark:border-neutral-700 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">MÉTODOS DE PAGO (AUTOMÁTICOS)</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Efectivo:</span>
                            <span className="font-semibold">{formatCOP(shiftSummary.blindCount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Débito:</span>
                            <span className="font-semibold">{formatCOP(shiftSummary.debitSales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Crédito:</span>
                            <span className="font-semibold">{formatCOP(shiftSummary.creditSales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Transferencias:</span>
                            <span className="font-semibold">{formatCOP(shiftSummary.otherSales)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-2 border-gray-300 dark:border-neutral-600 rounded p-3 bg-gray-50 dark:bg-neutral-700/50">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">DIFERENCIA</div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold">Resultado:</span>
                          <span className={`text-lg font-bold ${
                            shiftSummary.difference === 0 ? 'text-green-600 dark:text-green-400' :
                            shiftSummary.difference > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {shiftSummary.difference >= 0 ? '+' : ''}{formatCOP(shiftSummary.difference)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {errorShift && <div className="text-xs text-red-600">{errorShift}</div>}
                    <div className="flex justify-end gap-3 pt-2">
                      <button disabled={loadingShift} onClick={() => setShiftStep('menu')} className="px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700">Atrás</button>
                      <button
                        disabled={loadingShift}
                        onClick={handleConfirmCloseShift}
                        className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60"
                      >{loadingShift ? 'Cerrando…' : 'Confirmar Cierre'}</button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <button onClick={onGoInventory} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6">
          <div className="text-2xl font-semibold text-black dark:text-white">Inventario</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Gestiona stock de productos: registrar, editar, eliminar, historial.</div>
        </button>
        <button onClick={onGoCash} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Caja</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Realiza ventas, factura prendas y elige método de pago.</div>
        </button>
        <button onClick={onGoContabilidad} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Contabilidad</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Reportes diarios: totales, métodos de pago y exportación CSV.</div>
        </button>
        <button onClick={onGoConfiguracion} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Configuración</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Preferencias: tamaño de fuente y contraste.</div>
        </button>
      </div>
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onLogout}
          disabled={!onLogout}
          className="inline-flex items-center gap-2 rounded border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-700/40 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            fill="currentColor"
          >
            <path d="M14.75 4a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0V5.5h-6v13h6v-1.25a.75.75 0 0 1 1.5 0V19.5a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7 19.5v-13A1.5 1.5 0 0 1 8.5 5h6.25zm3.53 7.53a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H12a.75.75 0 0 1 0-1.5h3.94l-1.72-1.72a.75.75 0 1 1 1.06-1.06l3 3z" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </main>
  )
}
