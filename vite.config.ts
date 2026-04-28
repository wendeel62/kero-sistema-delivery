import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['date-fns', 'framer-motion']
  },
  build: {
    commonjsOptions: {
      exclude: ['date-fns', 'framer-motion']
    }
  }
})
