const eslint = require('@eslint/js')
const reactPlugin = require('eslint-plugin-react')

module.exports = [
  eslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    plugins: {
      react: reactPlugin
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      // Mark JSX variables as used so no-unused-vars doesn't flag React components/imports
      'react/jsx-uses-vars': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    },
    settings: {
      react: { version: 'detect' }
    }
  },
  {
    files: ['src/main/**/*.js', 'src/preload/**/*.js', '*.config.js', '*.config.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    ignores: ['dist/**', 'out/**', 'node_modules/**']
  }
]
