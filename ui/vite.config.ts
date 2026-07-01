import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
  plugins: [
    tailwindcss(),
    react(),
    ...(process.env.BUILD_TARGET !== 'web' ? [
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['electron-squirrel-startup', 'electron-updater']
              }
            }
          }
        },
        preload: {
          input: 'electron/preload.ts',
        },
      })
    ] : []),
    VitePWA({
      disable: process.env.NODE_ENV !== 'production',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        id: '/',
        name: 'LumvalePDF',
        short_name: 'LumvalePDF',
        description: 'A free, high-quality, and fast open-source PDF toolkit.',
        scope: '/',
        start_url: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay'],
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            // Maskable variant so Android/desktop installers can crop to the
            // platform's icon shape without clipping content.
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,worker.js}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: [
      'pdfjs-dist/legacy/build/pdf.mjs',
      'pdfjs-dist/legacy/build/pdf.worker.mjs'
    ],
    exclude: ['@huggingface/transformers']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    watch: {
      ignored: [
        '**/test-results/**',
        '**/tests/**',
        '**/playwright-report/**',
        '**/playwright/**'
      ]
    }
  }
})
