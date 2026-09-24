import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const backendProxy = {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
  // EnrollPro-synced tenant assets (school logo) are served by the API.
  '/uploads': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    allowedHosts: ['atheng.buru-degree.ts.net'],
    proxy: backendProxy,
  },
  preview: {
    port: 5174,
    proxy: backendProxy,
  },
})
