import { z } from 'zod';
import { createEnv } from '@t3-oss/env-core';

const IS_BROWSER = typeof window !== 'undefined';

// Don't worry about this block, it is tree-shaken out in the browser
if (!IS_BROWSER) {
  // Let the client know if the EE is enabled but don't expose the license key
  process.env.EE_ENABLED = Boolean(process.env.EE_LICENSE_KEY)
    ? 'true'
    : 'false';

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
    'EE_ENABLED'
  ];

  PUBLIC_ENV_LIST.forEach((key) => {
    const prefixedKey = `NEXT_PUBLIC_${key}`;
    process.env[prefixedKey] = process.env[key];
  });
}

export const env = createEnv({
  client: {
    NEXT_PUBLIC_WEBAPP_URL: z.string().url(),
    NEXT_PUBLIC_STORAGE_URL: z.string().url(),
    NEXT_PUBLIC_PLATFORM_URL: z.string().url(),
    NEXT_PUBLIC_REALTIME_APP_KEY: z.string(),
    NEXT_PUBLIC_REALTIME_HOST: z.string(),
    NEXT_PUBLIC_REALTIME_PORT: z.coerce.number(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_EE_ENABLED: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true')
  },
  // process.env is added here to allow access while on server, it is tree-shaken out in the browser
  // if you check in the browser, you will see runtimeEnv is set to window.__ENV only
  runtimeEnv: IS_BROWSER ? window.__ENV : process.env,
  clientPrefix: 'NEXT_PUBLIC_'
});
