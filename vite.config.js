import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Bundle budget: main (entry) bundle should stay under 150 KB gzipped so initial load
// stays fast. Route chunks are lazy-loaded; vendor is cached. Re-check with: npm run build
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('firebase')) return 'vendor-firebase'
            if (id.includes('lucide-react')) return 'vendor-lucide'
            if (id.includes('chart.js') || id.includes('react-chartjs')) return 'vendor-chart'
            if (id.includes('date-fns')) return 'vendor-date-fns'
            return 'vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
})
