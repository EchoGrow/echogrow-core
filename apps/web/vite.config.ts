import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
          if (!id.includes('node_modules')) return;

          // ============================================================
          // 1. PDF generation (heavy, loaded only when exporting)
          // ============================================================
          if (id.includes('@react-pdf') || id.includes('pdfkit')) {
            return 'pdf-renderer';
          }

          // 2. PDF parsing (pdfjs-dist, heavy, loaded only when uploading PDF)
          if (id.includes('pdfjs-dist')) {
            return 'pdfjs';
          }

          // 3. Animations
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }

          // 4. Icons
          if (id.includes('lucide-react')) {
            return 'lucide-react';
          }

          // 5. Toast notifications (sonner)
          if (id.includes('sonner')) {
            return 'sonner';
          }

          // 6. React core (React + React DOM + React Router)
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }

          // 7. Everything else
          return 'vendor';
        },
      },
    },
    // Raise warning limit slightly (pdf-renderer will still be large)
    chunkSizeWarningLimit: 1500,
  },
});