import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Geliştirme: `npm run dev` hem Vite'ı hem de Cloudflare Functions'ı (wrangler) birlikte çalıştırır.
// /api istekleri 8788 portundaki wrangler'a yönlendirilir.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8788', changeOrigin: false },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/exceljs')) return 'excel';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/pdf-lib') || id.includes('node_modules/qrcode')) return 'pdf';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'react';
          return undefined;
        },
      },
    },
  },
});
