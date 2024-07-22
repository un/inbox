import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    OTEL_ENABLED: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    OTEL_EXPORTER_TRACES_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_LOGS_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_METRICS_ENDPOINT: z.string().url().optional(),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
});
