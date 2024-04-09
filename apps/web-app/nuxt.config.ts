import type { MailDomainEntries } from '@u22n/types';

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
    '@vite-pwa/nuxt',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxt/ui'
  ],
  // ssr: false,
  routeRules: {
    '/**': { ssr: false },
    '/redirect': { ssr: true },
    '/join/**': { ssr: true },
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
    mailBridge: {
      url: process.env.WEBAPP_MAILBRIDGE_URL || '',
      key: process.env.WEBAPP_MAILBRIDGE_KEY || '',
      postalDnsRootUrl: process.env.MAILBRIDGE_POSTAL_SERVERS_DNS_ROOT_URL || ''
    },
    storage: {
      url: process.env.WEBAPP_STORAGE_URL || '',
      key: process.env.WEBAPP_STORAGE_KEY || ''
    },
    public: {
      platformUrl: process.env.PLATFORM_URL || '',
      siteUrl: process.env.WEBAPP_URL || '',
      storageUrl: process.env.WEBAPP_STORAGE_URL || '',
      mailDomainPublic: [] as MailDomainEntries[],
      mailDomainPremium: [] as MailDomainEntries[],
      realtime: {
        host: process.env.REALTIME_HOST || '',
        port: Number(process.env.REALTIME_PORT || ''),
        appKey: process.env.REALTIME_APP_KEY || '',
        authEndpoint: `${process.env.PLATFORM_URL}/realtime/auth`
      }
    }
  },

  // Styling
  css: ['@/assets/css/main.css'],
  app: {
    head: {
      title: 'UnInbox'
    },
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
  pinia: {
    storesDirs: []
  },

  pwa: {
    client: {
      registerPlugin: true
    },
    pwaAssets: {
      image: 'assets/logo.svg',
      disabled: false,
      htmlPreset: '2023',
      preset: 'minimal-2023',
      includeHtmlHeadLinks: true
    },
    manifest: {
      name: 'UnInbox',
      short_name: 'UnInbox',
      theme_color: '#ffffff',
      description:
        "Uninbox is an open-source, self hostable email service by Unproprietary Corporation. It's Modern email for teams and professionals. A replacement for outdated email technology and tools.",
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    devOptions: {
      enabled: false
    }
  },

  security: {
    headers: {
      crossOriginEmbedderPolicy:
        process.env.NODE_ENV === 'development'
          ? 'unsafe-none'
          : 'credentialless',
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', process.env.WEBAPP_STORAGE_URL || '']
      }
    }
  }
});
