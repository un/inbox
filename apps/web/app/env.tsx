import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const IS_BROWSER = typeof window !== 'undefined';

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
    const prefixedKey = `PUBLIC_${key}`;
    if (typeof process.env[key] !== 'undefined') {
      process.env[prefixedKey] = process.env[key];
    }
  });
}

export const env = createEnv({
  client: {
    PUBLIC_WEBAPP_URL: z.string().url(),
    PUBLIC_STORAGE_URL: z.string().url(),
    PUBLIC_PLATFORM_URL: z.string().url(),
    PUBLIC_REALTIME_APP_KEY: z.string(),
    PUBLIC_REALTIME_HOST: z.string(),
    PUBLIC_REALTIME_PORT: z.coerce.number().optional(),
    PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    PUBLIC_EE_ENABLED: z.enum(['true', 'false']),
    PUBLIC_BILLING_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    PUBLIC_APP_VERSION: z.string().default('development'),
    PUBLIC_POSTHOG_ENABLED: z.enum(['true', 'false']).default('false'),
    PUBLIC_POSTHOG_KEY: z.string().optional()
  },
  // process.env is added here to allow access while on server, it is tree-shaken out in the browser
  // if you check in the browser, you will see runtimeEnv is set to window.__ENV only
  runtimeEnv: IS_BROWSER ? window.__ENV : process.env,
  clientPrefix: 'PUBLIC_'
});

export function EnvInjection(props: {
  ENV: Record<string, string | undefined>;
}) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__ENV = ${JSON.stringify(props.ENV)}`
      }}
    />
  );
}

declare global {
  interface Window {
    __ENV: Record<string, string>;
  }
}
