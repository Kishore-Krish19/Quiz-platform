import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Disable Vite internal HMR WebSocket client in Google AI Studio preview and Express middleware mode
      hmr: false,
      watch: null,
      // `npm run dev` mounts this dev server on the same port every competitor's browser
      // talks to. By default Vite will serve any file under the project root, which
      // hands out the server source (seeded answers included), data/ (the store
      // snapshot with every correct option, the JWT secret file) and more. Serve only
      // what the browser app needs.
      fs: {
        strict: true,
        allow: [
          path.resolve(__dirname, 'index.html'),
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'node_modules'),
        ],
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/data/**', '**/.jwt-secret'],
      },
    },
  };
});
