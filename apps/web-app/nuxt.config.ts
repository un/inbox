export default defineNuxtConfig({
  // extends: ['../../nuxt-layers/landing-page'],

  modules: [
    '@nuxt/devtools',
    '@unocss/nuxt',
    'nuxt-icon',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    'nuxt-security',
    'nuxt-prepare',
    '@nuxtjs/turnstile',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt'
  ],

  runtimeConfig: {
    // paths: [...pagePaths],
    recoverySecret: process.env.WEBAPP_RECOVERY_SECRET || '',
    sessionSecret: process.env.WEBAPP_SESSION_SECRET || '',
    jwks: '',
    realtimeUrl: process.env.WEBAPP_REALTIME_URL || '',
    realtimeKey: process.env.WEBAPP_REALTIME_KEY || '',
    mailBridgeUrl: process.env.WEBAPP_MAILBRIDGE_URL || '',
    mailBridgeKey: process.env.WEBAPP_MAILBRIDGE_KEY || '',
    public: {
      siteUrl: process.env.WEBAPP_URL || 'https://uninbox.com',
      hanko: {
        apiURL: process.env.WEBAPP_HANKO_API_URL || '',
        cookieName: process.env.NUXT_PUBLIC_HANKO_COOKIE_NAME || 'hanko'
      }
    },
    turnstile: {
      secretKey: process.env.WEBAPP_TURNSTILE_SECRET_KEY || ''
    }
  },

  // Styling
  css: ['@/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in', duration: 300 }
  },
  colorMode: {
    classSuffix: ''
  },

  // Nitro/Build Configs

  build: {
    transpile: ['trpc-nuxt']
  },
  typescript: {
    shim: false
  },
  // import the Pinia stores
  imports: {
    dirs: ['stores']
  },
  nitro: {
    prerender: {
      crawlLinks: true // recommended
    }
  },
  /**
   * * Module Configurations
   */

  //* Pinia
  pinia: {
    autoImports: [['defineStore', 'definePiniaStore'], 'acceptHMRUpdate']
  },

  //* Nuxt-Security
  turnstile: {
    siteKey: process.env.WEBAPP_TURNSTILE_SITE_KEY || ''
  },
  security: {
    headers: {
      crossOriginEmbedderPolicy: {
        value:
          process.env.NODE_ENV === 'development'
            ? 'unsafe-none'
            : 'require-corp',
        route: '/**'
      }
    }
  }
});
