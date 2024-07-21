import { join } from 'path';

// import the env file to validate the environment variables before starting the app
await import('./src/env.js');

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
  }
};

export default config;
