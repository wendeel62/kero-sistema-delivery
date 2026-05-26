import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@schemas': path.resolve(__dirname, './src/schemas'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    ViteImageOptimizer({
      // PNG optimization
      png: {
        quality: 80,
        compressionLevel: 9,
      },
      // JPEG optimization
      jpeg: {
        quality: 80,
        progressive: true,
      },
      // JPG optimization
      jpg: {
        quality: 80,
        progressive: true,
      },
      // WebP optimization
      webp: {
        quality: 80,
        lossless: false,
        effort: 4,
      },
      // AVIF optimization
      avif: {
        quality: 70,
        effort: 4,
      },
      // SVG optimization
      svg: {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeViewBox: false,
              },
            },
          } as any,
          'removeViewBox',
        ],
      },
      // Cache directory
      cache: true,
      cacheLocation: './node_modules/.cache/vite-plugin-image-optimizer',
      // Log level
      logStats: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'icons/*.png'],
      manifest: {
        name: 'Kero Delivery',
        short_name: 'Kero',
        description: 'Sistema de gestão de delivery e cardápio digital',
        theme_color: '#e8391a',
        background_color: '#16181f',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        id: '/',
        lang: 'pt-BR',
        categories: ['business', 'food', 'shopping'],
        icons: [
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [],
        shortcuts: [
          {
            name: 'Cardápio Admin',
            short_name: 'Cardápio',
            url: '/cardapio-admin',
            icons: [
              {
                src: 'icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Pedidos',
            short_name: 'Pedidos',
            url: '/pedidos',
            icons: [
              {
                src: 'icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'PDV',
            short_name: 'PDV',
            url: '/pdv',
            icons: [
              {
                src: 'icons/icon-96x96.png',
                sizes: '96x96',
                type: 'image/png',
              },
            ],
          },
        ],
      },
      workbox: {
        // Estratégia de cache para navegação (SPA fallback)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/admin/],

        // Limite de arquivo para precaching (bundle JS é ~2.8 MiB)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB

        // Runtime caching
        runtimeCaching: [
          {
            // Google Fonts - cache first com expiração longa
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts static - cache first
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Material Symbols Outlined - cache first
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/css2\?.*Material.Symbols.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'material-symbols-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase API - network first com fallback de cache
            urlPattern: /^https:\/\/[a-z]+\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Imagens do Supabase Storage - cache first
            urlPattern: /^https:\/\/[a-z]+\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Imagens externas gerais - cache first
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // CDN JS - stale while revalidate
            urlPattern: /^https:\/\/cdn\.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        // Limpar caches antigos ao atualizar
        cleanupOutdatedCaches: true,

        // Skip waiting e claim clients para ativação imediata
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['date-fns', 'framer-motion'],
  },
  build: {
    commonjsOptions: {
      exclude: ['date-fns', 'framer-motion'],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-router')) {
              return 'vendor'
            }
            if (id.includes('recharts')) {
              return 'charts'
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'maps'
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'forms'
            }
            if (id.includes('framer-motion')) {
              return 'ui'
            }
            return 'vendor'
          }
        },
      },
    },
    // Divisão de chunks por tamanho
    chunkSizeWarningLimit: 500,
  },
})
