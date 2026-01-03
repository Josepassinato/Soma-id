import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: [
          'localhost',
          '.emergentagent.com',
          '.preview.emergentagent.com'
        ],
        proxy: {
          '/api': {
            target: 'http://localhost:8001',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      build: {
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              // Split vendor chunks
              'react-vendor': ['react', 'react-dom'],
              'supabase': ['@supabase/supabase-js'],
              'query': ['@tanstack/react-query'],
            }
          }
        }
      },
      plugins: [react()],
      define: {
        // Backend URL for API calls - use relative URL in production
        'window.BACKEND_URL': JSON.stringify('/api'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Expose env variables with VITE_ prefix
      envPrefix: 'VITE_'
    };
});
