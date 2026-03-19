/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {}
  },
  // Enable class strategy so we can toggle dark via a root class
  darkMode: 'class',
  plugins: []
}
