import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    WEBAPP_URL: z.string().url(),
    EE_LICENSE_KEY: z.string().nullable().default(null),
    BILLING_KEY: z.string().min(1),
    BILLING_URL: z.string().url().min(1),
    BILLING_STRIPE_PLAN_PRO_MONTHLY_ID: z.string().min(1),
    BILLING_STRIPE_PLAN_PRO_YEARLY_ID: z.string().min(1),
    BILLING_STRIPE_KEY: z.string().min(1),
    BILLING_STRIPE_WEBHOOK_KEY: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535).default(3800),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  client: {},
  clientPrefix: '_', // Not used, just for making TS happy
  runtimeEnv: process.env
});
