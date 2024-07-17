import { createEnv } from '@t3-oss/env-core';
import { seconds } from '@u22n/utils/ms';
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
    MAILBRIDGE_MODE: z.enum(['handler', 'worker', 'dual']).default('dual'),
    MAILBRIDGE_QUEUE_COMPLETED_MAX_AGE_SECONDS: z.coerce
      .number()
      .int()
      .default(seconds('72 hours')),
    MAILBRIDGE_URL: z.string().url(),
    MAILBRIDGE_KEY: z.string().min(1),
    STORAGE_URL: z.string().url(),
    STORAGE_KEY: z.string().min(1),
    MAILBRIDGE_POSTAL_SERVERS: stringToJSON.pipe(
      z
        .array(
          z.object({
            url: z.string(),
            controlPanelSubDomain: z.string(),
            ipv4: z.string().ip({ version: 'v4' }),
            ipv6: z.string().ip({ version: 'v6' }),
            webhookPubKey: z.string(),
            dbConnectionString: z.string(),
            defaultNewPool: z.string(),
            active: z.boolean(),
            routesDomain: z.string()
          })
        )
        .refine((servers) => servers.filter((_) => _.active).length > 0, {
          message: 'At least one server must be active'
        })
    ),
    MAILBRIDGE_POSTAL_SERVER_PERSONAL_CREDENTIALS: stringToJSON.pipe(
      z.object({
        apiUrl: z.string().min(1),
        apiKey: z.string().min(1)
      })
    ),
    MAILBRIDGE_POSTAL_SERVER_LIMITS: stringToJSON.pipe(
      z.object({
        messageRetentionDays: z.number().int().min(1),
        outboundSpamThreshold: z.number().int().min(1),
        rawMessageRetentionDays: z.number().int().min(1),
        rawMessageRetentionSize: z.number().int().min(1)
      })
    ),
    MAILBRIDGE_POSTAL_WEBHOOK_DESTINATIONS: stringToJSON.pipe(
      z.object({
        events: z.string().url(),
        messages: z.string().url()
      })
    ),
    MAIL_DOMAINS: stringToJSON.pipe(
      z.object({
        free: z.array(z.string()),
        premium: z.array(z.string()),
        fwd: z.array(z.string())
      })
    ),
    MAILBRIDGE_POSTAL_SERVERS_DNS_ROOT_URL: z.string().min(1),
    MAILBRIDGE_LOCAL_MODE: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    REALTIME_HOST: z.string().min(1),
    REALTIME_PORT: z.string(),
    REALTIME_APP_ID: z.string().min(1),
    REALTIME_APP_KEY: z.string().min(1),
    REALTIME_APP_SECRET: z.string().min(1),
    DB_MYSQL_MIGRATION_URL: z.string().min(1),
    DB_REDIS_CONNECTION_STRING: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535).default(3100),
    NODE_ENV: z.enum(['development', 'production']).default('development')
  },
  runtimeEnv: process.env
});

export const activePostalServer = env.MAILBRIDGE_POSTAL_SERVERS.find(
  (server) => server.active
)!; // We know this will always be defined because of the refine
