const { resolve } = require('path')
const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

// Configuración Vite para ejecutar la app como página web pura
// Reutiliza la carpeta de renderer que ya tienes (src/renderer)
module.exports = defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  build: {
    // Carpeta de salida para la versión web (dist-web), separada de Electron
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true
  },
  server: {
    // Puedes cambiar el puerto si lo necesitas
    port: 5173,
    strictPort: false
  }
})
