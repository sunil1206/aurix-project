/**
 * Vite config for the Aurix React SPA.
 *
 * Dev server proxies /api -> Django so the browser doesn't need CORS
 * during local development. In production the frontend ships as static
 * files and talks to the API origin directly via VITE_API_BASE_URL.
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
