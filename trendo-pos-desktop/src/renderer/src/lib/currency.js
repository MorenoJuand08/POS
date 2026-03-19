// Currency utilities for COP (Colombian Peso)
// - formatCOP: for display with currency symbol
// - formatCOPInput: for input masking (no symbol, thousands separated by '.')
// - parseCOP: parse user input into integer pesos

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCOP(value) {
  if (value === '' || value === null || value === undefined) return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return copFormatter.format(n)
}

export function formatCOPInput(value) {
  if (value === '' || value === null || value === undefined) return ''
  // Accept numbers or strings; keep only digits, group thousands with '.'
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return ''
  // Group every three digits with '.'
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseCOP(str) {
  if (!str) return 0
  const digits = String(str).replace(/\D/g, '')
  if (!digits) return 0
  const n = parseInt(digits, 10)
  return Number.isNaN(n) ? 0 : n
}

export default { formatCOP, formatCOPInput, parseCOP }
