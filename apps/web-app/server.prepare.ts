import { defineNuxtPrepareHandler } from 'nuxt-prepare/config';

export default defineNuxtPrepareHandler(async () => {
  // Do some async magic here, e.g. fetch data from an API

  // Get and store the Hanko jwks into runtime config
  const hankoUrl = process.env.WEBAPP_HANKO_API_URL;
  const hankoJwksResponse = await fetch(
    `${hankoUrl}/.well-known/jwks.json`
  ).then(function (response) {
    return response.json();
  });

  return {
    // Overwrite the runtime config variable `foo`
    runtimeConfig: {
      hankoJwks: hankoJwksResponse,
      public: {}
    }
  };
});
