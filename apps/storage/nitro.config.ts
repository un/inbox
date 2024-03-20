import { defineNitroConfig } from 'nitropack/config';

//https://nitro.unjs.io/config
export default defineNitroConfig({
  imports: {
    autoImport: false
  },
  runtimeConfig: {
    storageKey: process.env.STORAGE_KEY,
    s3: {
      endpoint: process.env.STORAGE_S3_ENDPOINT,
      region: process.env.STORAGE_S3_REGION,
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
      bucketAttachments: process.env.STORAGE_S3_BUCKET_ATTACHMENTS,
      bucketAvatars: process.env.STORAGE_S3_BUCKET_AVATARS
    }
  },
  routeRules: {
    '/avatar/**': {
      proxy: {
        to: `${process.env.STORAGE_S3_ENDPOINT}/${process.env.STORAGE_S3_BUCKET_AVATARS}/**`
      }
    },
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Origin': process.env.WEBAPP_URL!,
        'Access-Control-Allow-Credentials': 'true'
      }
    }
  }
});
