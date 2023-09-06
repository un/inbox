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
    realtimeUrl: process.env.WEBAPP_REALTIME_URL || '',
    realtimeKey: process.env.WEBAPP_REALTIME_KEY || '',
    mailBridgeUrl: process.env.WEBAPP_MAILBRIDGE_URL || '',
    mailBridgeKey: process.env.WEBAPP_MAILBRIDGE_KEY || '',
    cfImagesToken: process.env.WEBAPP_CF_IMAGES_TOKEN || '',
    cfAccountId: process.env.WEBAPP_CF_ACCOUNT_ID || '',
    public: {
      mailDomainPublic: JSON.parse(
        process.env.MAIL_DOMAIN_PUBLIC
      ) as MailDomainEntries[],
      mailDomainPremium:
        (JSON.parse(process.env.MAIL_DOMAIN_PREMIUM) as MailDomainEntries[]) ||
        [],
      cfImagesAccountHash: process.env.WEBAPP_CF_IMAGES_ACCOUNT_HASH || '',
      siteUrl: process.env.WEBAPP_URL || '',
      hanko: {
        apiURL: process.env.WEBAPP_HANKO_API_URL || '',
        cookieName: process.env.WEBAPP_HANKO_COOKIE_NAME || 'hanko'
      }
    },
    turnstile: {
      secretKey: process.env.WEBAPP_TURNSTILE_SECRET_KEY || ''
    },
    auth: {
      // The session cookie name
      name: 'un-session',
      password: process.env.WEBAPP_SESSION_SECRET || '',
      maxAge:
        process.env.NODE_ENV === 'development'
          ? 60 * 60 * 12
          : 60 * 60 * 24 * 30,

      cookie: {
        sameSite: 'lax',
        //@ts-ignore
        domain: process.env.PRIMARY_DOMAIN
      }
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
    storage: {
      sessions: {
        driver: 'redis',
        base: 'sessions',
        url: process.env.DB_REDIS_URL,
        ttl:
          process.env.NODE_ENV === 'development'
            ? 60 * 60 * 12
            : 60 * 60 * 24 * 30
      }
    },
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
      },
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', 'imagedelivery.net']
      }
    }
  }
});

interface MailDomainEntries {
  name: string;
  postalId: string;
}
