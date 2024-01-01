import { resolve } from 'node:path';

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
    '@nuxt/ui'
  ],

  runtimeConfig: {
    // paths: [...pagePaths],
    authJs: {
      secret: process.env.WEBAPP_AUTH_SECRET // You can generate one with `openssl rand -base64 32`
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
    cf: {
      accountId: process.env.WEBAPP_CF_ACCOUNT_ID || '',
      zoneId: process.env.WEBAPP_CF_ZONE_ID || '',
      token: process.env.WEBAPP_CF_IMAGES_TOKEN || ''
    },
    public: {
      cfImagesAccountHash: process.env.WEBAPP_CF_IMAGES_ACCOUNT_HASH || '',
      siteUrl: process.env.WEBAPP_URL || '',
      storageUrl: process.env.WEBAPP_STORAGE_URL || '',
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
    // auth: {
    //   // The session cookie name
    //   name: 'un-session',
    //   password: process.env.WEBAPP_SESSION_SECRET || '',
    //   maxAge:
    //     process.env.NODE_ENV === 'development'
    //       ? 60 * 60 * 12
    //       : 60 * 60 * 24 * 30,

    //   cookie: {
    //     sameSite: 'lax',
    //     //@ts-ignore
    //     domain: process.env.PRIMARY_DOMAIN
    //   }
    // }
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

  //* Nuxt-Security
  turnstile: {
    siteKey: process.env.WEBAPP_TURNSTILE_SITE_KEY || ''
  },
  security: {
    headers: {
      crossOriginEmbedderPolicy:
        process.env.NODE_ENV === 'development' ? 'unsafe-none' : 'require-corp',
      contentSecurityPolicy: {
        'img-src': [
          "'self'",
          'data:',
          'imagedelivery.net',
          process.env.WEBAPP_STORAGE_URL || ''
        ]
      }
    }
  }
});
