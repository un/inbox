// Let the client know if the EE is enabled
process.env.NEXT_PUBLIC_EE_ENABLED = process.env.EE_LICENSE_KEY
  ? 'true'
  : 'false';

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
  }
};

export default config;
