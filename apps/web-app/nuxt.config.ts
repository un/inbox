import type { MailDomainEntries } from '@uninbox/types';

export default defineNuxtConfig({
  telemetry: false,
  modules: [
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
  // ssr: false,
  routeRules: {
    '/**': { ssr: false },
    '/redirect': { ssr: true },
    '/join/**': { ssr: true },
    '/login/**': { ssr: true },
    '/': { ssr: true }
  },

  runtimeConfig: {
    // paths: [...pagePaths],
    primaryDomain: process.env.PRIMARY_DOMAIN || 'localhost',
    auth: {
      baseUrl: process.env.WEBAPP_URL || 'http://localhost:3000',
      secret: process.env.WEBAPP_AUTH_SECRET,
      passkeys: {
        rpName: process.env.APP_NAME || 'UnInbox',
        rpID: process.env.PRIMARY_DOMAIN || 'localhost',
        origin: process.env.WEBAPP_URL || 'http://localhost:3000'
      }
    },
    authJs: {},
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
      mailDomainPremium: [] as MailDomainEntries[]
    },
    turnstile: {
      secretKey: process.env.WEBAPP_TURNSTILE_SECRET_KEY || ''
    }
  },

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
      strictTransportSecurity: 
      process.env.NODE_ENV === 'development' 
      ? false 
      : {
        maxAge: 15552000,
        includeSubdomains: true
      },
      crossOriginEmbedderPolicy:
        process.env.NODE_ENV === 'development' ? 'unsafe-none' : 'require-corp',
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', process.env.WEBAPP_STORAGE_URL || ''],
        'upgrade-insecure-requests' : process.env.NODE_ENV === 'development' ? false : true
      }
    }
  }
});
