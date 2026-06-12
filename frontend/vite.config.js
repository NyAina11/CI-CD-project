import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le frontend dialogue avec le backend Express/Socket.IO sur le port 4000.
// En dev, Vite proxifie /api et /socket.io pour éviter les soucis de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true
      }
    }
  }
});
