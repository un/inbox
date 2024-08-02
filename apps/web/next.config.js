import { join } from 'path';

/** @type {import("next").NextConfig} */
const config = {
  // Checked in CI anyways
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: join(
      new URL('.', import.meta.url).pathname,
      '../../'
    ),
    outputFileTracingIncludes: {
      '/': ['./public/*']
    },
    instrumentationHook: true
  },
  // https://posthog.com/docs/advanced/proxy/nextjs
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*'
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*'
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide'
      }
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true
};

export default config;
