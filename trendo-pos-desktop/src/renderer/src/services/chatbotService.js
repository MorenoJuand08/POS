import { supabase } from './supabaseClient'

/**
 * Servicio de chatbot inteligente
 * Maneja consultas y responde basado en datos de Supabase
 */

// Consultas predefinidas para productos bajos en stock
export async function getProductsLowStock(threshold = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, stock_xs, stock_s, stock_m, stock_l, stock_xl, price')

    if (error) throw error
    
    // Filtrar productos con stock bajo en cualquier talla
    const lowStockProducts = (data || []).filter(p => {
      const totalStock = (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      return totalStock <= threshold
    })
    
    return lowStockProducts
  } catch (e) {
    console.error('Error fetching low stock products:', e)
    return []
  }
}

// Obtener todos los productos
export async function getAllProducts() {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, stock_xs, stock_s, stock_m, stock_l, stock_xl, price')

    if (error) throw error
    return data || []
  } catch (e) {
    console.error('Error fetching all products:', e)
    return []
  }
}

// Obtener resumen de inventario
export async function getInventorySummary() {
  try {
    const products = await getAllProducts()
    
    const totalProducts = products.length
    const totalStock = products.reduce((sum, p) => {
      return sum + (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
    }, 0)

    const lowStockCount = products.filter(p => {
      const total = (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      return total <= 5
    }).length

    const avgPriceTotal = products.reduce((sum, p) => sum + (p.price || 0), 0)
    const avgPrice = products.length > 0 ? Math.round(avgPriceTotal / products.length) : 0

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      avgPrice,
      products
    }
  } catch (e) {
    console.error('Error getting inventory summary:', e)
    return null
  }
}

// Obtener productos más costosos
export async function getExpensiveProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')
      .order('price', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (e) {
    console.error('Error fetching expensive products:', e)
    return []
  }
}

// Obtener productos más económicos
export async function getCheapProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')
      .order('price', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (e) {
    console.error('Error fetching cheap products:', e)
    return []
  }
}

// Búsqueda por nombre de producto
export async function searchProductByName(name) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')
      .ilike('product_name', `%${name}%`)
      .limit(10)

    if (error) throw error
    return data || []
  } catch (e) {
    console.error('Error searching products:', e)
    return []
  }
}

// Obtener productos con ALTO stock (bestsellers potenciales)
export async function getHighStockProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    // Calcular stock total para cada producto
    const withTotal = (data || []).map(p => ({
      ...p,
      totalStock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
    }))
    
    // Ordenar por stock descendente y tomar los top
    return withTotal.sort((a, b) => b.totalStock - a.totalStock).slice(0, limit)
  } catch (e) {
    console.error('Error fetching high stock products:', e)
    return []
  }
}

// Obtener productos que se venderán más rápido (stock medio con buen precio)
export async function getTrendingProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    // Calcular score de trending (stock medio + precio bueno)
    const withScore = (data || []).map(p => {
      const totalStock = (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      const avgStockPerSize = totalStock / 5
      // Score: productos con stock balanceado entre tallas (entre 3-15 por talla) = buenos candidatos de venta
      const stockScore = Math.abs(avgStockPerSize - 8) < 10 ? avgStockPerSize : avgStockPerSize / 2
      const priceScore = p.price > 0 ? p.price : 0
      const trendingScore = stockScore * (priceScore / 100)
      
      return {
        ...p,
        totalStock,
        trendingScore
      }
    })
    
    return withScore.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, limit)
  } catch (e) {
    console.error('Error fetching trending products:', e)
    return []
  }
}

// Análisis por talla (cuál talla es la más popular por volumen)
export async function getTallaSizeAnalysis() {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    const products = data || []
    const sizeStats = {
      xs: products.reduce((sum, p) => sum + (p.stock_xs || 0), 0),
      s: products.reduce((sum, p) => sum + (p.stock_s || 0), 0),
      m: products.reduce((sum, p) => sum + (p.stock_m || 0), 0),
      l: products.reduce((sum, p) => sum + (p.stock_l || 0), 0),
      xl: products.reduce((sum, p) => sum + (p.stock_xl || 0), 0)
    }
    
    const total = Object.values(sizeStats).reduce((a, b) => a + b, 0)
    const percentages = {}
    
    Object.keys(sizeStats).forEach(size => {
      percentages[size] = total > 0 ? ((sizeStats[size] / total) * 100).toFixed(1) : 0
    })
    
    return { sizeStats, percentages, total }
  } catch (e) {
    console.error('Error analyzing sizes:', e)
    return null
  }
}

// Productos con mejor relación stock/precio (más rentables)
export async function getProfitableProducts(limit = 5) {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    // Score de rentabilidad: precio alto + stock disponible
    const withProfit = (data || []).map(p => {
      const totalStock = (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      const potentialRevenue = (p.price || 0) * totalStock
      
      return {
        ...p,
        totalStock,
        potentialRevenue: Math.round(potentialRevenue)
      }
    })
    
    return withProfit.sort((a, b) => b.potentialRevenue - a.potentialRevenue).slice(0, limit)
  } catch (e) {
    console.error('Error calculating profitable products:', e)
    return []
  }
}

// Recomendación de qué comprar más (falta stock)
export async function getRestockRecommendations() {
  try {
    const { data, error } = await supabase
      .schema('trendo')
      .from('product')
      .select('product_id, product_name, price, stock_xs, stock_s, stock_m, stock_l, stock_xl')

    if (error) throw error
    
    const products = data || []
    
    // Detectar desbalances en tallas (una talla tiene mucho menos que otras)
    const recommendations = products.map(p => {
      const stocks = [
        { talla: 'XS', stock: p.stock_xs || 0 },
        { talla: 'S', stock: p.stock_s || 0 },
        { talla: 'M', stock: p.stock_m || 0 },
        { talla: 'L', stock: p.stock_l || 0 },
        { talla: 'XL', stock: p.stock_xl || 0 }
      ]
      
      const totalStock = stocks.reduce((sum, s) => sum + s.stock, 0)
      const avgStock = totalStock / 5
      
      // Encontrar tallas con stock bajo vs promedio
      const lowTallas = stocks.filter(s => s.stock < avgStock / 2)
      
      return {
        product_name: p.product_name,
        price: p.price,
        totalStock,
        lowTallas,
        priority: lowTallas.length > 2 ? 'ALTA' : lowTallas.length > 0 ? 'MEDIA' : 'BAJA'
      }
    }).filter(r => r.priority !== 'BAJA')
    
    return recommendations.sort((a, b) => {
      if (a.priority === 'ALTA' && b.priority !== 'ALTA') return -1
      if (a.priority !== 'ALTA' && b.priority === 'ALTA') return 1
      return b.totalStock - a.totalStock
    }).slice(0, 8)
  } catch (e) {
    console.error('Error getting restock recommendations:', e)
    return []
  }
}

// Análisis de cobertura (cuántas semanas de stock tenemos aprox)
export async function getStockCoverageAnalysis() {
  try {
    const summary = await getInventorySummary()
    if (!summary) return null
    
    const { totalStock, totalProducts } = summary
    const avgStockPerProduct = totalProducts > 0 ? totalStock / totalProducts : 0
    
    // Estimación: si vendemos ~2 piezas por producto por semana
    const estimatedWeeklyVelocity = totalProducts * 2
    const coverageWeeks = estimatedWeeklyVelocity > 0 ? (totalStock / estimatedWeeklyVelocity).toFixed(1) : 0
    
    return {
      totalStock,
      estimatedWeeklyVelocity,
      coverageWeeks,
      status: coverageWeeks > 8 ? '✅ Excelente' : coverageWeeks > 4 ? '⚠️ Normal' : '🔴 Crítico'
    }
  } catch (e) {
    console.error('Error analyzing stock coverage:', e)
    return null
  }
}

// Función para procesar preguntas del chatbot
export async function processChatbotQuery(userMessage) {
  const message = userMessage.toLowerCase().trim()

  // Saludos personalizados
  if (message === 'hola' || message === 'hi' || message === 'hey' || message === 'buenos días' || message === 'buenas noches' || message === 'buenas tardes') {
    const saludos = [
      '¡Hola! 👋 Soy tu asistente de Trendo. ¿Qué información sobre inventario, precios o productos buscas hoy?',
      '¡Hola! 👋 Bienvenido a Trendo. ¿En qué puedo ayudarte? Puedo consultar sobre stock, precios, productos y más.',
      '¡Hola! 🎉 Estoy aquí para ayudarte con información del POS. ¿Qué necesitas saber?'
    ]
    const random = Math.floor(Math.random() * saludos.length)
    return {
      type: 'text',
      content: saludos[random]
    }
  }

  // Respuestas para consultas sobre inventario bajo
  if (message.includes('bajo stock') || message.includes('stock bajo') || message.includes('productos bajos') || message.includes('qué productos están bajos')) {
    const lowStock = await getProductsLowStock()
    if (lowStock.length === 0) {
      return {
        type: 'text',
        content: '✅ Excelente: todos los productos tienen stock adecuado. No hay productos con stock bajo en este momento.'
      }
    }
    return {
      type: 'table',
      content: lowStock.map(p => ({
        nombre: p.product_name,
        xs: p.stock_xs || 0,
        s: p.stock_s || 0,
        m: p.stock_m || 0,
        l: p.stock_l || 0,
        xl: p.stock_xl || 0,
        precio: `$${p.price || 0}`
      })),
      title: '📦 Productos con stock bajo'
    }
  }

  // Resumen de inventario
  if (message.includes('inventario') || message.includes('stock total') || message.includes('cuánto stock') || message.includes('resumen de inventario')) {
    const summary = await getInventorySummary()
    if (!summary) {
      return { type: 'text', content: 'No pude obtener el resumen de inventario.' }
    }
    return {
      type: 'stats',
      content: {
        totalProducts: summary.totalProducts,
        totalStock: summary.totalStock,
        lowStockCount: summary.lowStockCount,
        avgPrice: summary.avgPrice
      }
    }
  }

  // Productos más caros
  if (message.includes('caro') || message.includes('costoso') || message.includes('precios altos') || message.includes('mayor precio')) {
    const expensive = await getExpensiveProducts()
    if (expensive.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: expensive.map(p => ({
        nombre: p.product_name,
        precio: `$${p.price || 0}`,
        stock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      })),
      title: '💎 Productos más costosos'
    }
  }

  // Productos más económicos
  if (message.includes('barato') || message.includes('económico') || message.includes('precios bajos') || message.includes('menor precio') || message.includes('ofertas')) {
    const cheap = await getCheapProducts()
    if (cheap.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: cheap.map(p => ({
        nombre: p.product_name,
        precio: `$${p.price || 0}`,
        stock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
      })),
      title: '💰 Productos más económicos'
    }
  }

  // Consulta sobre tallas específicas
  if (message.includes('talla m') || message.includes('talla l') || message.includes('talla s') || message.includes('talla xl') || message.includes('talla xs')) {
    const products = await getAllProducts()
    
    let talla = ''
    if (message.includes('talla m') || message.includes('m ')) talla = 'm'
    else if (message.includes('talla l')) talla = 'l'
    else if (message.includes('talla s')) talla = 's'
    else if (message.includes('talla xl')) talla = 'xl'
    else if (message.includes('talla xs')) talla = 'xs'

    const stockKey = `stock_${talla}`
    const filtered = products.filter(p => (p[stockKey] || 0) > 0)
    
    if (filtered.length === 0) {
      return { type: 'text', content: `No hay productos disponibles en talla ${talla.toUpperCase()}.` }
    }

    return {
      type: 'table',
      content: filtered.slice(0, 10).map(p => ({
        nombre: p.product_name,
        stock: p[stockKey] || 0,
        precio: `$${p.price || 0}`
      })),
      title: `👕 Productos disponibles talla ${talla.toUpperCase()}`
    }
  }

  // Búsqueda por nombre de producto
  if (message.includes('busca') || message.includes('encuentra') || message.includes('camiseta') || message.includes('pantalón') || message.includes('zapatos')) {
    // Extraer palabras clave
    const keywords = message.replace(/busca|encuentra|producto/g, '').trim()
    if (keywords.length > 2) {
      const results = await searchProductByName(keywords)
      if (results.length === 0) {
        return { type: 'text', content: `No encontré productos que coincidan con "${keywords}".` }
      }
      return {
        type: 'table',
        content: results.map(p => ({
          nombre: p.product_name,
          precio: `$${p.price || 0}`,
          stock: (p.stock_xs || 0) + (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0)
        })),
        title: '🔍 Resultados de búsqueda'
      }
    }
  }

  // Productos con alto stock (bestsellers potenciales)
  if (message.includes('stock alto') || message.includes('más stock') || message.includes('más cantidad') || message.includes('bestseller') || message.includes('productos con más') || message.includes('más en stock')) {
    const highStock = await getHighStockProducts()
    if (highStock.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: highStock.map(p => ({
        nombre: p.product_name,
        stock: p.totalStock,
        precio: `$${p.price || 0}`
      })),
      title: '📊 Productos con mayor stock (Best sellers potenciales)'
    }
  }

  // Productos trending/que se venderán más
  if (message.includes('trending') || message.includes('se venderá más') || message.includes('vender más rápido') || message.includes('más popular') || message.includes('próximos a vender')) {
    const trending = await getTrendingProducts()
    if (trending.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: trending.map(p => ({
        nombre: p.product_name,
        stock: p.totalStock,
        precio: `$${p.price || 0}`,
        score: p.trendingScore.toFixed(0)
      })),
      title: '🔥 Productos que se venderán más rápido'
    }
  }

  // Análisis por tallas
  if (message.includes('análisis talla') || message.includes('talla más popular') || message.includes('cuál talla') || message.includes('análisis de tallas') || message.includes('distribución de tallas')) {
    const sizeAnalysis = await getTallaSizeAnalysis()
    if (!sizeAnalysis) {
      return { type: 'text', content: 'No pude obtener el análisis de tallas.' }
    }
    return {
      type: 'table',
      content: [
        {
          talla: 'XS',
          cantidad: sizeAnalysis.sizeStats.xs,
          porcentaje: `${sizeAnalysis.percentages.xs}%`
        },
        {
          talla: 'S',
          cantidad: sizeAnalysis.sizeStats.s,
          porcentaje: `${sizeAnalysis.percentages.s}%`
        },
        {
          talla: 'M',
          cantidad: sizeAnalysis.sizeStats.m,
          porcentaje: `${sizeAnalysis.percentages.m}%`
        },
        {
          talla: 'L',
          cantidad: sizeAnalysis.sizeStats.l,
          porcentaje: `${sizeAnalysis.percentages.l}%`
        },
        {
          talla: 'XL',
          cantidad: sizeAnalysis.sizeStats.xl,
          porcentaje: `${sizeAnalysis.percentages.xl}%`
        }
      ],
      title: '👕 Análisis de distribución por tallas'
    }
  }

  // Productos rentables
  if (message.includes('rentable') || message.includes('ingresos') || message.includes('ganancia') || message.includes('más dinero') || message.includes('potencial de venta')) {
    const profitable = await getProfitableProducts()
    if (profitable.length === 0) {
      return { type: 'text', content: 'No hay datos de productos disponibles.' }
    }
    return {
      type: 'table',
      content: profitable.map(p => ({
        nombre: p.product_name,
        precio: `$${p.price || 0}`,
        stock: p.totalStock,
        'ingresos potenciales': `$${p.potentialRevenue || 0}`
      })),
      title: '💰 Productos más rentables (mayor potencial de ingresos)'
    }
  }

  // Recomendaciones de recompra
  if (message.includes('comprar') || message.includes('reabastecer') || message.includes('reponer') || message.includes('qué comprar') || message.includes('desabastecimiento') || message.includes('recomendación de compra')) {
    const recommendations = await getRestockRecommendations()
    if (recommendations.length === 0) {
      return { type: 'text', content: '✅ El inventario está bien balanceado. No hay recomendaciones urgentes de compra.' }
    }
    return {
      type: 'table',
      content: recommendations.map(r => ({
        producto: r.product_name,
        precio: `$${r.price || 0}`,
        'stock total': r.totalStock,
        'tallas bajas': r.lowTallas.map(t => t.talla).join(', ') || 'Ninguna',
        prioridad: r.priority
      })),
      title: '🛒 Recomendaciones de recompra por desbalance de tallas'
    }
  }

  // Cobertura de stock
  if (message.includes('cobertura') || message.includes('semanas de stock') || message.includes('cuánto dura el stock') || message.includes('tiempo de stock')) {
    const coverage = await getStockCoverageAnalysis()
    if (!coverage) {
      return { type: 'text', content: 'No pude calcular la cobertura de stock.' }
    }
    return {
      type: 'stats',
      content: {
        'stock total': coverage.totalStock,
        'velocidad estimada (por semana)': coverage.estimatedWeeklyVelocity,
        'cobertura': `${coverage.coverageWeeks} semanas`,
        'estado': coverage.status
      }
    }
  }

  // Respuesta más inteligente para otras preguntas
  if (message.length > 0) {
    const respuestas = [
      'Esa es una pregunta interesante. 🤔 Puedo ayudarte mejor con consultas sobre:\n• Productos con más stock\n• Qué se venderá más rápido\n• Análisis de rentabilidad\n• Recomendaciones de compra',
      'Entiendo tu pregunta. 💭 Para más precisión, intenta preguntar sobre:\n• Stock alto (bestsellers)\n• Análisis por tallas\n• Productos rentables\n• Cobertura de stock',
      '¡Buena pregunta! 🎯 Aunque no puedo responder directamente eso, puedo ayudarte con:\n• Productos trending\n• Análisis de inventario\n• Recomendaciones de recompra\n• Análisis de ganancias potenciales'
    ]
    const random = Math.floor(Math.random() * respuestas.length)
    return {
      type: 'text',
      content: respuestas[random]
    }
  }

  // Fallback final
  return {
    type: 'text',
    content: '❓ No entendí tu pregunta. Aquí hay cosas que puedo hacer:\n\n📊 **Análisis de Stock:**\n• Productos con más stock\n• Qué se venderá más rápido (trending)\n• Cobertura de stock (semanas)\n\n💰 **Análisis Financiero:**\n• Productos más rentables\n• Potencial de ingresos\n\n👕 **Análisis de Tallas:**\n• Distribución por tallas\n• Recomendaciones de recompra\n\n📦 **Inventario:**\n• Stock bajo\n• Resumen general'
  }
}
