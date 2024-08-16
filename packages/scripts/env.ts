import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const stringToJSON = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str) as unknown;
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
});

export const env = createEnv({
  server: {
    WEBAPP_URL: z.string().url(),
    APP_NAME: z.string().min(1).default('UnInbox'),
    PRIMARY_DOMAIN: z.string(),
    REALTIME_HOST: z.string().min(1),
    REALTIME_PORT: z.string().optional(),
    REALTIME_APP_ID: z.string().min(1),
    REALTIME_APP_KEY: z.string().min(1),
    REALTIME_APP_SECRET: z.string().min(1),
    MAILBRIDGE_URL: z.string().url(),
    MAILBRIDGE_KEY: z.string().min(1),
    MAILBRIDGE_POSTAL_SERVERS_DNS_ROOT_URL: z.string().min(1),
    MAILBRIDGE_LOCAL_MODE: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    MAIL_DOMAINS: stringToJSON.pipe(
      z.object({
        free: z.array(z.string()),
        premium: z.array(z.string()),
        fwd: z.array(z.string())
      })
    ),
    MAILBRIDGE_TRANSACTIONAL_CREDENTIALS: stringToJSON.pipe(
      z.object({
        apiUrl: z.string().url(),
        apiKey: z.string().min(1),
        sendAsName: z.string().min(1),
        sendAsEmail: z.string().email()
      })
    ),
    STORAGE_URL: z.string().url(),
    STORAGE_KEY: z.string().min(1),
    WORKER_ACCESS_KEY: z.string().min(32),
    DB_REDIS_CONNECTION_STRING: z.string().min(1),
    TURNSTILE_SECRET_KEY: z.string().nullable().default(null),
    UNKEY_ROOT_KEY: z.string().nullable().default(null),
    EE_LICENSE_KEY: z.string().nullable().default(null),
    BILLING_KEY: z.string().nullable().default(null),
    BILLING_URL: z.string().url().nullable().default(null),
    PORT: z.coerce.number().int().min(1).max(65535).default(3300),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
});
