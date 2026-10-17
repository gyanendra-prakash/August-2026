import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev mein /api ki saari requests backend (port 5000) ko proxy hoti hain,
// isliye frontend mein CORS ya hardcoded URL ki zaroorat nahi.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    },
  },
});
