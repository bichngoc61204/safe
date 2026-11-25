import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { renderIntroduction } from './scripts/seo-pages.mjs';

function staticIntroduction() {
  return {
    name: 'safemap-static-introduction',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!/^\/gioi-thieu\/?(?:\?|$)/.test(req.url)) return next();
        try {
          const [home, template] = await Promise.all([
            readFile(new URL('./index.html', import.meta.url), 'utf8'),
            readFile(new URL('./seo/gioi-thieu.html', import.meta.url), 'utf8'),
          ]);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderIntroduction(home.match(/<head>([\s\S]*?)<\/head>/)[1], template));
        } catch (error) { next(error); }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), staticIntroduction()],
  optimizeDeps: {
    // Pre-bundle the SDK before the lazy Firebase backend is requested.
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet/')) return 'leaflet';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
        },
      },
    },
  },
});
