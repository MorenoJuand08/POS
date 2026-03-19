/**
 * Utilidad para importar productos desde archivos Excel y CSV
 * Soporta formatos .xlsx, .csv y .txt usando SheetJS
 */

import * as XLSX from 'xlsx'

export function parseCSVData(csvText) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const products = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const product = {}

    headers.forEach((header, idx) => {
      if (values[idx]) {
        product[header] = values[idx]
      }
    })

    if (product.item || product.codigo || product.product_id) {
      products.push(product)
    }
  }

  return products
}

/**
 * Parsear datos desde Excel (.xlsx)
 */
export function parseExcelData(arrayBuffer) {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convertir a JSON, comenzando desde la fila 1 (headers)
    const products = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      blankrows: false
    })

    // Normalizar claves a minúsculas
    return products.map(row => {
      const normalized = {}
      Object.entries(row).forEach(([key, value]) => {
        normalized[key.toLowerCase().trim()] = value
      })
      return normalized
    })
  } catch (err) {
    console.error('Error parsing Excel:', err)
    throw new Error(`Error al leer Excel: ${err.message}`)
  }
}

/**
 * Validar un producto importado
 * Retorna { valid: boolean, errors: string[], product: object }
 */
export function validateImportedProduct(product) {
  const errors = []

  // Campos requeridos
  const item = product.item || product.codigo || product.product_id || product.code
  if (!item || String(item).trim() === '') {
    errors.push('Falta código/item del producto')
  }

  const title = product.title || product.nombre || product.product_name || product.name
  if (!title || String(title).trim() === '') {
    errors.push('Falta nombre del producto')
  }

  const price = product.price || product.precio || product.price_prod
  const priceNum = parseInt(String(price).replace(/[^\d]/g, ''), 10)
  if (!price || isNaN(priceNum) || priceNum <= 0) {
    errors.push('Precio inválido o menor a 0')
  }

  // Gender
  const gender = String(product.gender || product.genero || 'Hombre').trim().toLowerCase()
  const validGenders = ['hombre', 'mujer']
  if (!validGenders.includes(gender)) {
    errors.push('Género debe ser: Hombre o Mujer')
  }

  // Tallas (opcional pero deben ser números válidos si existen)
  const sizes = ['xs', 's', 'm', 'l', 'xl']
  sizes.forEach(size => {
    const stockKey = `stock_${size}` 
    const stock = product[stockKey] || product[size] || 0
    const stockNum = parseInt(String(stock), 10)
    if (isNaN(stockNum) || stockNum < 0) {
      errors.push(`Stock ${size.toUpperCase()} debe ser un número >= 0`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    product: {
      item: String(item).trim(),
      title: String(title).trim(),
      price: String(price).replace(/[^\d]/g, ''),
      gender: gender === 'mujer' ? 'Mujer' : 'Hombre',
      xs: parseInt(String(product.stock_xs || product.xs || 0), 10) || 0,
      s: parseInt(String(product.stock_s || product.s || 0), 10) || 0,
      m: parseInt(String(product.stock_m || product.m || 0), 10) || 0,
      l: parseInt(String(product.stock_l || product.l || 0), 10) || 0,
      xl: parseInt(String(product.stock_xl || product.xl || 0), 10) || 0,
      description: product.description || product.descripcion || ''
    }
  }
}

/**
 * Procesar archivo Excel/CSV subido
 * Retorna { products: [], errors: [] }
 */
export async function processExcelFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target.result
        const isCSV = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')
        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')

        let rawProducts = []

        if (isCSV) {
          rawProducts = parseCSVData(content)
        } else if (isExcel) {
          // Para Excel, el content es un ArrayBuffer
          rawProducts = parseExcelData(content)
        } else {
          resolve({
            products: [],
            errors: [
              {
                row: 0,
                error: 'Formato no soportado. Usa .xlsx, .csv o .txt'
              }
            ]
          })
          return
        }

        const { valid, invalid } = validateProducts(rawProducts)
        resolve({ products: valid, errors: invalid })
      } catch (err) {
        resolve({
          products: [],
          errors: [{ row: 0, error: `Error al procesar archivo: ${err.message}` }]
        })
      }
    }

    reader.onerror = () => {
      resolve({
        products: [],
        errors: [{ row: 0, error: 'Error al leer el archivo' }]
      })
    }

    // Leer según el tipo de archivo
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file, 'UTF-8')
    }
  })
}

/**
 * Validar múltiples productos
 */
function validateProducts(products) {
  const valid = []
  const invalid = []

  products.forEach((product, idx) => {
    const validation = validateImportedProduct(product)
    if (validation.valid) {
      valid.push(validation.product)
    } else {
      invalid.push({
        row: idx + 2, // +2 porque empieza en 1 y hay header
        product: product,
        errors: validation.errors
      })
    }
  })

  return { valid, invalid }
}

/**
 * Retorna el formato recomendado de CSV/Excel
 */
export function getImportTemplate() {
  return {
    headers: [
      'item',
      'title',
      'price',
      'gender',
      'stock_xs',
      'stock_s',
      'stock_m',
      'stock_l',
      'stock_xl',
      'description'
    ],
    example: [
      {
        item: 'CAMISETA001',
        title: 'Camiseta Básica Blanca',
        price: '25000',
        gender: 'Hombre',
        stock_xs: '5',
        stock_s: '10',
        stock_m: '15',
        stock_l: '8',
        stock_xl: '3',
        description: 'Camiseta de algodón 100%'
      },
      {
        item: 'JEAN002',
        title: 'Jean Azul Oscuro',
        price: '65000',
        gender: 'Mujer',
        stock_xs: '2',
        stock_s: '5',
        stock_m: '8',
        stock_l: '6',
        stock_xl: '1',
        description: 'Jean tiro alto'
      }
    ]
  }
}
