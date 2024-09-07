import { vitePlugin as remix } from '@remix-run/dev';
import tsConfigPaths from 'vite-tsconfig-paths';
import { flatRoutes } from 'remix-flat-routes';
import { remixPWA } from '@remix-pwa/dev';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext'
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()]
    }
  },
  server: {
    port: 3000
  },
  plugins: [
    tsConfigPaths(),
    remix({
      ignoredRouteFiles: ['**/*'],
      routes: (defineRoutes) => flatRoutes('routes', defineRoutes),
      future: {
        v3_fetcherPersist: true,
        v3_throwAbortReason: true,
        v3_relativeSplatPath: true
      }
    }),
    remixPWA()
  ]
});
