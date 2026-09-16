import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { isPublicSupabaseKey } from './src/data/publicSupabaseKey.js'

function unavailableWorkflowStatus() {
  const middleware = (server) => {
    server.middlewares.use('/api/workflow-status', (request, response, next) => {
      if (request.method !== 'GET') return next()
      response.setHeader('content-type', 'application/json; charset=utf-8')
      response.setHeader('cache-control', 'no-store')
      response.end(JSON.stringify({ available: false }))
    })
  }
  return { name: 'vite-only-workflow-status', configureServer: middleware, configurePreviewServer: middleware }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_')
  if (environment.VITE_SUPABASE_ANON_KEY && !isPublicSupabaseKey(environment.VITE_SUPABASE_ANON_KEY)) {
    throw new Error('VITE_SUPABASE_ANON_KEY must be a Supabase publishable key or legacy anon JWT. Never expose a service-role key.')
  }
  return {
  plugins: [react(), tailwindcss(), unavailableWorkflowStatus()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase/') || id.includes('node_modules/@scalar/')) return 'supabase-vendor'
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) return 'react-vendor'
          return undefined
        },
      },
    },
  },
  }
})
