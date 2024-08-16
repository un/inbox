import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    WEBAPP_URL: z.string().url(),
    STORAGE_KEY: z.string().min(1),
    STORAGE_S3_ENDPOINT: z.string().min(1),
    STORAGE_S3_REGION: z.string().min(1),
    STORAGE_S3_ACCESS_KEY_ID: z.string().min(1),
    STORAGE_S3_SECRET_ACCESS_KEY: z.string().min(1),
    STORAGE_S3_BUCKET_ATTACHMENTS: z.string().min(1),
    STORAGE_S3_BUCKET_AVATARS: z.string().min(1),
    DB_REDIS_CONNECTION_STRING: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535).default(3200),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  client: {},
  clientPrefix: '_', // Not used, just for making TS happy
  runtimeEnv: process.env
});
