import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, all /api requests are proxied to the backend (port 5000),
// so the frontend needs no CORS setup or hardcoded URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    },
  },
});
