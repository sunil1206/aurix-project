/**
 * Vite config for the Aurix React SPA.
 *
 * Dev server proxies /api -> Django so the browser never needs CORS in
 * dev. The proxy target is read from the env so the same image works
 * both locally (`http://localhost:8000`) and inside docker-compose
 * (`http://web:8000`).
 *
 * In production the frontend ships as static files served by nginx,
 * which proxies /api to the backend itself (see frontend/nginx.conf).
 */
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_API_PROXY_TARGET ||
    process.env.VITE_API_PROXY_TARGET ||
    'http://localhost:8000'

  return {
    plugins: [react()],
    server: {
      host: true,        // listen on 0.0.0.0 so the container is reachable
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
