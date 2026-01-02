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
        ]
      },
      plugins: [react()],
      define: {
        // Backend URL for API calls
        'window.BACKEND_URL': JSON.stringify(env.BACKEND_URL || 'http://localhost:8001/api'),
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
