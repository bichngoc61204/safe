import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

function serveGameRoute(server) {
  server.middlewares.use((request, _response, next) => {
    request.url = request.url?.replace(/^\/game(?=\?|$)/, '/game/index.html');
    next();
  });
}

export default defineConfig({
  plugins: [react(), {
    name: 'game-entry',
    configureServer: serveGameRoute,
    configurePreviewServer: serveGameRoute,
  }],
  optimizeDeps: {
    // Pre-bundle the SDK before the lazy Firebase backend is requested.
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        game: fileURLToPath(new URL('./game/index.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet/')) return 'leaflet';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
        },
      },
    },
  },
});
