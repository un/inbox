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
  }
};

export default config;
