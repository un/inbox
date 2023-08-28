import { defineNuxtPrepareHandler } from 'nuxt-prepare/config';

export default defineNuxtPrepareHandler(async () => {
  // Do some async magic here, e.g. fetch data from an API

  return {
    // Overwrite the runtime config variable `foo`
    runtimeConfig: {
      public: {}
    }
  };
});
