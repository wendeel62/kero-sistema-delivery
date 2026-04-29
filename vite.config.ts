import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['date-fns', 'framer-motion'],
    include: ['react', 'react-dom', 'react-router-dom']
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    commonjsOptions: {
      exclude: ['date-fns', 'framer-motion']
    },
    rollupOptions: {
      output: {
        // Nomes de arquivos com hash para cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          // Separar dependências pesadas em chunks dedicados
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('recharts')) {
              return 'vendor-charts'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'vendor-forms'
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
          }
        }
      }
    }
  },
  // Compressão gzip
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
