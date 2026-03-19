/* eslint-disable no-undef */
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App'

// Definir globales para Vite
if (typeof window !== 'undefined') {
  window.console = window.console || console
  window.setTimeout = window.setTimeout || setTimeout
  window.setInterval = window.setInterval || setInterval
  window.clearTimeout = window.clearTimeout || clearTimeout
  window.clearInterval = window.clearInterval || clearInterval
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

