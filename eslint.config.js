import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules', '*.html', 'script.js'] },
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    rules: { ...js.configs.recommended.rules, 'react/jsx-uses-vars': 'error' },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
  },
  { files: ['src/**/*.{js,jsx}'], ...reactHooks.configs['recommended-latest'] },
  { files: ['src/**/*.{js,jsx}'], ...reactRefresh.configs.vite },
]
