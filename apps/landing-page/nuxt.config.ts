// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@nuxt/ui-pro'],
  modules: ['@nuxt/content', '@nuxt/ui', 'nuxt-og-image', '@vueuse/nuxt'],
  ui: {
    icons: ['heroicons', 'simple-icons', 'ph']
  },
  css: ['@/assets/css/main.css'],
  colorMode: {
    // classSuffix: '',
    preference: 'light', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    storageKey: 'un-color-mode'
  },
  devtools: {
    enabled: true
  },
  typescript: {
    strict: false
  },
  runtimeConfig: {
    // paths: [...pagePaths],
    databaseHost: process.env.NUXT_DATABASE_HOST || '',
    databaseUsername: process.env.NUXT_DATABASE_USERNAME || '',
    databasePassword: process.env.NUXT_DATABASE_PASSWORD || '',
    emailApiUrl: process.env.NUXT_EMAIL_API_URL || '',
    emailApiKey: process.env.NUXT_EMAIL_API_KEY || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://uninbox.com'
    }
  },
  routeRules:{
  '/oss-friends': { swr: 86400 },//ttl is set to 1day - 60*60*24
  }
});
