import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    // Installable shell only: precache static build output and keep the SPA
    // navigation fallback. API responses are never cached (online-only writes).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/health/],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.method === 'GET' && url.pathname.startsWith('/uploads/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'sort-uploads',
              expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['atheng.buru-degree.ts.net'],
    proxy: backendProxy,
  },
  preview: {
    port: 5174,
    proxy: backendProxy,
  },
})
