/** @type {import("next").NextConfig} */
const config = {
  // Checked in CI anyways
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0
    }
  },
  env: {
    NEXT_PUBLIC_EE_ENABLED: process.env.EE_LICENSE_KEY ? 'true' : 'false'
  }
};

export default config;
