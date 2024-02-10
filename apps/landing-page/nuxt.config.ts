// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@nuxt/ui-pro'],
  modules: ['@nuxt/content', '@nuxt/ui', 'nuxt-og-image'],
  ui: {
    icons: ['heroicons', 'simple-icons']
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
  }
});
