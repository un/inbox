import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    OTEL_ENABLED: z.coerce.boolean().default(false),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  runtimeEnv: process.env
});
