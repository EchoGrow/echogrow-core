import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // مكتبة الحركات
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // مكتبة الأيقونات
            if (id.includes('lucide-react')) {
              return 'lucide-react';
            }
            // مكتبة PDF
            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }
            // React و React DOM و React Router
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // أي مكتبة أخرى
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // رفع الحد إلى 1000 كيلوبايت
  },
})