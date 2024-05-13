import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DB_PLANETSCALE_HOST: z.string().min(1),
    DB_PLANETSCALE_USERNAME: z.string().min(1),
    DB_PLANETSCALE_PASSWORD: z.string().min(1),
    DB_MYSQL_MIGRATION_URL: z.string().min(1)
  },
  client: {},
  clientPrefix: '_', // Not used, just for making TS happy
  runtimeEnv: process.env
});
