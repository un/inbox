import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
  // Nitro options
  runtimeConfig: {
    url: process.env.MAILBRIDGE_URL,
    postalUrl: process.env.MAILBRIDGE_POSTAL_URL,
    postalControlPanel: process.env.MAILBRIDGE_POSTAL_CONTROL_PANEL,
    postalUser: process.env.MAILBRIDGE_POSTAL_USER,
    postalPass: process.env.MAILBRIDGE_POSTAL_PASSWORD,
    key: process.env.MAILBRIDGE_KEY
  }
});
