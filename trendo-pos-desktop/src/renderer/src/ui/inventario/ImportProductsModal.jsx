import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { processExcelFile, getImportTemplate } from '@/utils/importExcel'

export default function ImportProductsModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null)
  const [products, setProducts] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('upload') // 'upload' | 'review' | 'done'
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const isCSV = selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.name.toLowerCase().endsWith('.txt')
    const isExcel = selectedFile.name.toLowerCase().endsWith('.xlsx') || selectedFile.name.toLowerCase().endsWith('.xls')

    if (!isCSV && !isExcel) {
      setErrors([{ row: 0, error: 'Solo se aceptan archivos CSV, TXT o XLSX' }])
      return
    }

    setLoading(true)
    setErrors([])
    const result = await processExcelFile(selectedFile)
    setFile(selectedFile)
    setProducts(result.products)
    setErrors(result.errors)
    setLoading(false)

    if (result.products.length > 0) {
      setStep('review')
    }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      await onImport(products)
      setStep('done')
    } catch (err) {
      setErrors([{ row: 0, error: `Error al importar: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setProducts([])
    setErrors([])
    setStep('upload')
    onClose()
  }

  const downloadTemplate = () => {
    const template = getImportTemplate()
    const headers = template.headers
    const rows = template.example

    // Crear CSV
    let csv = headers.join(',') + '\n'
    rows.forEach(row => {
      const values = headers.map(h => {
        const val = row[h] || ''
        // Escapar comillas
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      })
      csv += values.join(',') + '\n'
    })

    // Descargar CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_productos.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadTemplateExcel = () => {
    const template = getImportTemplate()
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(template.example)
    
    // Ajustar ancho de columnas
    const columnWidths = [12, 25, 12, 10, 10, 10, 10, 10, 10, 20]
    worksheet['!cols'] = columnWidths.map(w => ({ wch: w }))
    
    // Estilo de header (opcional pero mejora la experiencia)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')
    XLSX.writeFile(workbook, 'plantilla_productos.xlsx')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Importar Productos
        </h2>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Sube un archivo CSV, TXT o XLSX con tus productos. Usa la plantilla para asegurar el formato correcto.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
                >
                  📥 CSV
                </button>
                <button
                  onClick={downloadTemplateExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium"
                >
                  📥 Excel
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded hover:bg-gray-800 transition font-medium"
              >
                📂 Seleccionar Archivo
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {file ? `Archivo: ${file.name}` : 'O arrastra tu archivo aquí'}
              </p>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <p className="font-semibold text-red-700 dark:text-red-400 mb-2">Errores encontrados:</p>
                <ul className="space-y-1">
                  {errors.slice(0, 5).map((err, i) => (
                    <li key={i} className="text-sm text-red-600 dark:text-red-300">
                      {err.row > 0 && `Fila ${err.row}: `}{err.error}
                    </li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-sm text-red-600 dark:text-red-300">
                      ... y {errors.length - 5} errores más
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 transition text-gray-900 dark:text-gray-100 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-400 font-semibold">
                ✓ {products.length} producto{products.length !== 1 ? 's' : ''} listo{products.length !== 1 ? 's' : ''} para importar
              </p>
            </div>

            <div className="border border-gray-300 dark:border-neutral-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-neutral-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold">Código</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold">Nombre</th>
                      <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-semibold">Precio</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300 font-semibold">Género</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300 font-semibold">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 10).map((p, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-neutral-600">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.item}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100 truncate">{p.title}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          ${parseInt(p.price).toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100 text-xs">{p.gender}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100 text-xs">
                          {(p.xs || 0) + (p.s || 0) + (p.m || 0) + (p.l || 0) + (p.xl || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {products.length > 10 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mostrando 10 de {products.length} productos
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('upload')}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 transition text-gray-900 dark:text-gray-100 font-medium disabled:opacity-50"
              >
                Atrás
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium disabled:opacity-50"
              >
                {loading ? 'Importando...' : '✓ Importar'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">✓ ¡Importación completada!</p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Se importaron {products.length} producto{products.length !== 1 ? 's' : ''} exitosamente
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded hover:bg-gray-800 transition font-medium"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
