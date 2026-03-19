import { useState, useEffect, useRef } from 'react'
import InvoiceTemplate from './InvoiceTemplate'

/**
 * Pantalla de progreso de facturación
 * Muestra 3 pasos: Generando Cobro → Generando Factura → Factura Generada
 * 
 * Props:
 * - saleData: datos de la venta generada
 * - invoiceType: 'Factura POS' o 'Facturación Electrónica'
 * - onBack: callback para volver
 * - onFinish: callback cuando se completa
 */
export default function InvoiceProgress({ saleData, invoiceType, onBack, onFinish }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const printRef = useRef(null)

  const steps = [
    { number: 1, title: 'Generando Cobro', description: 'Procesando información de pago' },
    { number: 2, title: 'Generando Factura', description: 'Creando documento fiscal' },
    { number: 3, title: 'Factura Generada', description: 'Listo para descargar e imprimir' }
  ]

  // Simular progreso de pasos
  useEffect(() => {
    if (currentStep < 3) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1)
      }, 1200)
      return () => clearTimeout(timer)
    } else {
      setIsComplete(true)
      // Si es facturación electrónica, simular envío a email
      if (invoiceType === 'Facturación Electrónica') {
        setTimeout(() => {
          setEmailSent(true)
        }, 800)
      }
    }
  }, [currentStep, invoiceType])

  async function handlePrint() {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (printRef.current) {
      printWindow.document.write(printRef.current.innerHTML)
      printWindow.document.close()
      printWindow.print()
    }
  }

  function handleDownload() {
    const element = document.createElement('a')
    const content = printRef.current.innerHTML
    const file = new Blob([content], { type: 'text/html' })
    element.href = URL.createObjectURL(file)
    element.download = `factura_${saleData?.sale_id || 'documento'}.html`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="w-screen h-screen bg-white dark:bg-neutral-900 fixed inset-0 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-hidden flex flex-col justify-between">
        <div className="flex-1 flex flex-col px-8 py-6 justify-center">
          {/* Header */}
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-black dark:text-white mb-1">Procesando Factura</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Tipo: <span className="font-semibold text-black dark:text-white">{invoiceType}</span>
            </p>
          </header>

          {/* Progress Steps */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="w-full max-w-2xl">
              {/* Step Indicators */}
              <div className="flex items-center justify-between mb-10">
                {steps.map((step, idx) => (
                  <div key={step.number} className="flex flex-col items-center relative flex-1">
                    {/* Número del paso */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg mb-4 transition-all duration-500 relative z-10 ${
                        idx < currentStep
                          ? 'bg-green-600 text-white shadow-lg'
                          : idx === currentStep
                          ? 'bg-blue-500 text-white shadow-lg animate-pulse'
                          : 'bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      {idx < currentStep ? '✓' : step.number}
                    </div>

                    {/* Línea conectora */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-1 transition-all duration-500 ${
                          idx < currentStep ? 'bg-green-600' : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      />
                    )}

                    {/* Texto */}
                    <p className="text-xs font-semibold text-black dark:text-white text-center whitespace-nowrap">{step.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1 whitespace-nowrap">{step.description}</p>
                  </div>
                ))}
              </div>

              {/* Barra de progreso general */}
              <div className="mb-8 bg-gray-300 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-600 transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
                />
              </div>

              {/* Mensaje de progreso */}
              {!isComplete && (
                <div className="text-center py-8">
                  <div className="inline-block mb-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-300 dark:border-slate-600" />
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                    {currentStep < steps.length ? steps[currentStep].description : 'Completando...'}...
                  </p>
                </div>
              )}

              {/* Mensaje de éxito - Facturación Electrónica */}
              {isComplete && invoiceType === 'Facturación Electrónica' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 text-green-600 animate-bounce">✓</div>
                  <h2 className="text-2xl font-bold text-green-600 mb-3">¡Factura Enviada!</h2>
                  {emailSent ? (
                    <>
                      <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
                        Se ha enviado correctamente al correo electrónico
                      </p>
                      <p className="text-sm font-semibold text-white bg-green-600 rounded-lg p-3 inline-block border border-green-700">
                        {saleData?.customer_email || 'del cliente'}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 text-sm">Enviando al correo...</p>
                  )}
                </div>
              )}

              {/* Mensaje de éxito - Factura POS */}
              {isComplete && invoiceType === 'Factura POS' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 text-green-600 animate-bounce">✓</div>
                  <h2 className="text-2xl font-bold text-green-600 mb-3">¡Factura Lista!</h2>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    Descarga e imprime tu factura
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {isComplete && (
            <div className="mt-4 space-y-3 flex flex-col items-center">
              {/* Botones de descargar/imprimir para AMBOS tipos */}
            <div className="flex gap-3 justify-center w-full flex-wrap">
                <button
                  onClick={handleDownload}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md border border-blue-700 text-sm"
                >
                  Descargar Factura
                </button>
                <button
                  onClick={handlePrint}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-md border border-green-700 text-sm"
                >
                  Imprimir Factura
                </button>
              </div>
              
              <div className="flex gap-3 justify-center w-full flex-wrap">
                <button
                  onClick={onBack}
                  className="px-5 py-2 bg-gray-400 dark:bg-slate-600 hover:bg-gray-500 dark:hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors shadow-md border border-gray-500 dark:border-slate-700 text-sm"
                >
                  Volver a Caja
                </button>
                <button
                  onClick={onFinish}
                  className="px-5 py-2 bg-black dark:bg-gray-800 hover:bg-gray-900 dark:hover:bg-gray-900 text-white rounded-lg font-semibold transition-colors shadow-md border border-gray-800 dark:border-gray-700 text-sm"
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Template oculto para impresión/descarga */}
      <div ref={printRef} style={{ display: 'none' }}>
        <InvoiceTemplate saleData={saleData} invoiceType={invoiceType} />
      </div>
    </div>
  )
}
