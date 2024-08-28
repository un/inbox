import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_POSTHOG_ENABLED = process.env.POSTHOG_ENABLED === 'true';

// Don't worry about this block, it is tree-shaken out in the browser
if (!IS_BROWSER) {
  // Let the client know if the EE is enabled but don't expose the license key
  process.env.EE_ENABLED = Boolean(process.env.EE_LICENSE_KEY)
    ? 'true'
    : 'false';

  process.env.APP_VERSION = process.env.npm_package_version;

  // DON'T ADD ANY SENSITIVE ENVIRONMENT VARIABLES HERE
  // All variables defined here will be exposed to the client
  const PUBLIC_ENV_LIST = [
    'WEBAPP_URL',
    'STORAGE_URL',
    'PLATFORM_URL',
    'REALTIME_APP_KEY',
    'REALTIME_HOST',
    'REALTIME_PORT',
    'TURNSTILE_SITE_KEY',
    'EE_ENABLED',
    'POSTHOG_KEY',
    'POSTHOG_ENABLED',
    'APP_VERSION',
    'BILLING_STRIPE_PUBLISHABLE_KEY'
  ];

  PUBLIC_ENV_LIST.forEach((key) => {
    const prefixedKey = `NEXT_PUBLIC_${key}`;
    if (typeof process.env[key] !== 'undefined') {
      process.env[prefixedKey] = process.env[key];
    }
  });
}

export const env = createEnv({
  client: {
    NEXT_PUBLIC_WEBAPP_URL: z.string().url(),
    NEXT_PUBLIC_STORAGE_URL: z.string().url(),
    NEXT_PUBLIC_PLATFORM_URL: z.string().url(),
    NEXT_PUBLIC_REALTIME_APP_KEY: z.string(),
    NEXT_PUBLIC_REALTIME_HOST: z.string(),
    NEXT_PUBLIC_REALTIME_PORT: z.coerce.number().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_EE_ENABLED: z.enum(['true', 'false']),
    NEXT_PUBLIC_BILLING_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_APP_VERSION: z.string().default('development'),
    NEXT_PUBLIC_POSTHOG_ENABLED: z.enum(['true', 'false']).default('false'),
    NEXT_PUBLIC_POSTHOG_KEY: IS_POSTHOG_ENABLED
      ? z.string()
      : z.string().optional()
  },
  // process.env is added here to allow access while on server, it is tree-shaken out in the browser
  // if you check in the browser, you will see runtimeEnv is set to window.__ENV only
  runtimeEnv: IS_BROWSER ? window.__ENV : process.env,
  clientPrefix: 'NEXT_PUBLIC_',
  skipValidation: IS_BROWSER && IS_DEV
});
