import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    PRIMARY_DOMAIN: z.string(),
    PLATFORM_URL: z.string().url(),
    DB_REDIS_CONNECTION_STRING: z.string().min(1),
    WORKER_ACCESS_KEY: z.string().min(32),
    PORT: z.coerce.number().int().min(1).max(65535).default(3400),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  runtimeEnv: process.env
});
