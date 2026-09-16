import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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

export default defineConfig({ plugins: [react(), tailwindcss(), unavailableWorkflowStatus()] })
