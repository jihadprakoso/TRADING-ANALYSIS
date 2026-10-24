import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// CATATAN KEAMANAN: kredensial API (GEMINI_API_KEY / OANDA_*) hanya dibaca
// oleh server.ts di sisi server. Jangan pernah menaruhnya di objek `define`
// karena nilainya akan ikut ter-inline ke bundle client.
export default defineConfig({
  // Relative base agar hasil build di dist/ bisa dibuka dari subfolder mana pun
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR can be disabled via the DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
