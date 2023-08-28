// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  //! FIXME: remove after update of nuxt-content to above 2.7.2
  alias: {
    'micromark/lib/preprocess.js': 'micromark',
    'micromark/lib/postprocess.js': 'micromark'
  },

  devtools: { enabled: true },
  modules: ['@nuxt/content', '@nuxtjs/color-mode'],
  // Styling
  css: ['@/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in', duration: 300 }
  },
  // colorMode: {
  //   classSuffix: ''
  // }
  // content: {
  //   // https://content.nuxtjs.org/api/configuration
  // }
  //   ogImage: {
  //   host: 'https://uninbox.com',
  //   fonts: [
  //     'Inter:400',
  //     {
  //       name: 'CalSans',
  //       weight: 800,
  //       // path must point to a public font file
  //       path: '/fonts/CalSans-SemiBold.ttf'
  //     }
  //   ]
  // },
  typescript: {
    shim: false
  },

  nitro: {
    prerender: {
      crawlLinks: true // recommended
    }
  }
  /**
   * * Module Configurations
   */

  //* Nuxt-Security
  // security: {
  //   headers: {
  //     crossOriginEmbedderPolicy: {
  //       value:
  //         process.env.NODE_ENV === 'development'
  //           ? 'unsafe-none'
  //           : 'require-corp',
  //       route: '/**'
  //     }
  //   }
  // }
});
