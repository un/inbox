import type { MailDomainEntries } from '@uninbox/types';

export default defineNuxtConfig({
  modules: [
    '@hebilicious/authjs-nuxt',
    '@nuxt/devtools',
    '@vueuse/nuxt',
    'nuxt-security',
    'nuxt-prepare',
    '@nuxtjs/turnstile',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxt/ui',
    '@vue-email/nuxt'
  ],

  runtimeConfig: {
    // paths: [...pagePaths],
    authJs: {
      secret: process.env.WEBAPP_AUTH_SECRET
    },
    realtime: {
      url: process.env.WEBAPP_REALTIME_URL || '',
      key: process.env.WEBAPP_REALTIME_KEY || ''
    },
    mailBridge: {
      url: process.env.WEBAPP_MAILBRIDGE_URL || '',
      key: process.env.WEBAPP_MAILBRIDGE_KEY || '',
      postalRootUrl: process.env.MAILBRIDGE_POSTAL_ROOT_URL || ''
    },
    storage: {
      url: process.env.WEBAPP_STORAGE_URL || '',
      key: process.env.WEBAPP_STORAGE_KEY || ''
    },
    public: {
      siteUrl: process.env.WEBAPP_URL || '',
      storageUrl: process.env.WEBAPP_STORAGE_URL || '',
      mailDomainPublic: [] as MailDomainEntries[],
      mailDomainPremium: [] as MailDomainEntries[],
      authJs: {
        baseUrl: process.env.WEBAPP_URL,
        verifyClientOnEveryRequest: true,
        authenticatedRedirectTo: '/redirect',
        guestRedirectTo: '/'
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
  // alias: {
  //     cookie: resolve(__dirname, "node_modules/cookie"),
  //     "cross-fetch": resolve(__dirname, "node_modules/cross-fetch"),
  //     "ipaddr.js": resolve(__dirname, "node_modules/ipaddr.js"),
  //   },
  build: {
    transpile: ['trpc-nuxt']
  },
  typescript: {
    shim: false
  },
  // import the Pinia stores
  // imports: {
  //   dirs: ['stores']
  // },
  // nitro: {
  // },
  /**
   * * Module Configurations
   */

  //* Pinia
  pinia: {
    // autoImports: [
    //   ['defineStore', 'definePiniaStore'],
    //   'acceptHMRUpdate',
    //   'storeToRefs'
    // ]
  },

  //* vue-email
  vueEmail: {
    baseUrl: process.env.WEBAPP_URL
  },

  //* Nuxt-Security
  turnstile: {
    siteKey: process.env.WEBAPP_TURNSTILE_SITE_KEY || ''
  },
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
