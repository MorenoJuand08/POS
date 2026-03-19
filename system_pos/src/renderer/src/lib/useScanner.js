// Hook para capturar entradas rápidas de un lector de código de barras.
// Detecta una ráfaga de teclas dentro de cierto umbral de tiempo y dispara callback al presionar Enter.
// Uso:
// const { buffer } = useScanner({ onScan: code => agregarItem(code) })
// Internamente ignora teclas de control y combina dígitos/letras.
import { useEffect, useRef, useState } from 'react'

export function useScanner({ onScan, minLength = 3, timeout = 40 } = {}) {
  const bufferRef = useRef('')
  const lastTimeRef = useRef(0)
  const [buffer, setBuffer] = useState('')
  const handlerRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      // NO capturar si el usuario está escribiendo en un input o textarea
      const target = e.target
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      const now = Date.now()
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now

      // Reset si pasa demasiado tiempo entre teclas
      if (delta > timeout) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        if (code.length >= minLength) {
          onScan && onScan(code)
        }
        bufferRef.current = ''
        setBuffer('')
        return
      }

      if (e.key.length === 1) { // carácter imprimible
        bufferRef.current += e.key
        setBuffer(bufferRef.current)
      }
    }

    handlerRef.current = handler
    window.addEventListener('keydown', handler)

    return () => {
      if (handlerRef.current) {
        window.removeEventListener('keydown', handlerRef.current)
      }
    }
  }, [onScan, minLength, timeout])

  return { buffer }
}

export default useScanner

