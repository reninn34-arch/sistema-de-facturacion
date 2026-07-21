import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false
          }
        }
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.VITE_PAYPAL_CLIENT_ID': JSON.stringify(env.VITE_PAYPAL_CLIENT_ID),
        'process.env.VITE_PAYPAL_SANDBOX': JSON.stringify(env.VITE_PAYPAL_SANDBOX)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('node-forge') || id.includes('crypto')) {
                  return 'vendor-crypto';
                }
                if (id.includes('jspdf') || id.includes('html2canvas')) {
                  return 'vendor-pdf';
                }
                if (id.includes('recharts')) {
                  return 'vendor-charts';
                }
                if (id.includes('heroicons')) {
                  return 'vendor-icons';
                }
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                  return 'vendor-react';
                }
              }
            }
          }
        }
      }
    };
});
