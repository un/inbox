export default defineNuxtConfig({
  telemetry: false,
  imports: {
    autoImport: false
  },
  hooks: {
    // remove the 'composables' and 'utils' from autoImports
    'imports:dirs': (_dirs) => {
      for (let i = 0; i < _dirs.length; i++) {
        if (
          (_dirs[i] ?? '').includes('composables') ||
          (_dirs[i] ?? '').includes('utils')
        ) {
          _dirs.splice(i, 1);
          i--;
        }
      }
      return;
    }
  },
  modules: [
    '@nuxt/devtools',
    '@vueuse/nuxt',
    'nuxt-security',
    'nuxt-prepare',
    '@nuxtjs/turnstile',
    '@nuxt/ui'
  ],
  // ssr: false,
  routeRules: {
    '/**': { ssr: false },
    '/redirect': { ssr: true },
    '/join/**': { ssr: true },
    '/': { ssr: true }
  },

  runtimeConfig: {},

  // Styling
  css: ['@/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in', duration: 100 },
    layoutTransition: { name: 'layout', mode: 'out-in', duration: 100 }
  },
  ui: {
    prefix: 'nuxt-ui-',
    global: true,
    icons: ['ph', 'mdi', 'svg-spinners']
  },
  // Handled by NuxtUi
  colorMode: {
    // classSuffix: '',
    preference: 'light', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    storageKey: 'un-color-mode'
  },

  // Nitro/Build Configs

  build: {
    transpile: ['trpc-nuxt']
  },
  typescript: {
    shim: false
  },

  /**
   * * Module Configurations
   */

  //* Pinia

  //* Nuxt-Security
  security: {
    headers: {
      crossOriginEmbedderPolicy:
        process.env.NODE_ENV === 'development' ? 'unsafe-none' : 'require-corp',
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', process.env.WEBAPP_STORAGE_URL || '']
      }
    }
  }
});
