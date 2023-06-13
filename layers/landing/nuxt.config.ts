export default defineNuxtConfig({
  modules: [],

  runtimeConfig: {
    // paths: [...pagePaths],
  },

  // Styling
  // css: ['@/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in', duration: 300 }
  },

  // import the Pinia stores
  imports: {
    dirs: ['stores']
  },

  // Configs

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
    autoImports: [['defineStore', 'definePiniaStore']]
  }

  //* Nuxt-Security
  // security: {
  //   headers: {
  //     crossOriginEmbedderPolicy: {
  //       value: process.env.NODE_ENV === 'development' ? 'unsafe-none' : 'require-corp',
  //       route: '/**'
  //     }
  //   }
  // }
});
