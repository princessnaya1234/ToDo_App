import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Two build modes:
 *   default      - talks to the Express API; the dev server proxies /api to it.
 *   --mode pages - reads .env.pages: browser-only build for GitHub Pages.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // A GitHub Pages project site is served from /<repo>/, not the domain root,
    // so assets need that prefix. Local builds keep the default '/'.
    base: env.VITE_BASE || '/',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.API_URL || 'http://localhost:4000',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});
