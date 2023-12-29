//https://nitro.unjs.io/config
export default defineNitroConfig({
  runtimeConfig: {
    storageKey: process.env.STORAGE_KEY,
    s3Endpoint: process.env.STORAGE_S3_ENDPOINT,
    s3Region: process.env.STORAGE_S3_REGION,
    s3AccessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY
    // runtime config
  },
  routeRules: {
    '/avatar/**': { proxy: 'http://localhost:3902/avatars/**' }
  }
});
