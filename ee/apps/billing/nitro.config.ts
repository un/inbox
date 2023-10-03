import { defineNitroConfig } from 'nitropack/config';
import fetch from 'node-fetch'; // or import axios from 'axios';

const eeLicenseKey = process.env.EE_LICENSE_KEY;
const appUrl = process.env.WEBAPP_URL;

async function validateLicenseKey(key: string, appUrl: string) {
  const response = await fetch('https://ee.u22n.com/api/license/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, appUrl })
  });

  if (!response.valid) {
    throw new Error(
      '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key. Please check https://github.com/uninbox/uninbox/tree/main/ee for more information about the license'
    );
  }
}

if (eeLicenseKey && appUrl) {
  validateLicenseKey(eeLicenseKey, appUrl).catch((error) => {
    console.error(error);
    throw new Error(
      '🚨 Something went wrong when trying to validate the license key. Please check https://github.com/uninbox/uninbox/tree/main/ee for more information about the license'
    );
  });
} else {
  throw new Error(
    '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key or app url. Please check https://github.com/uninbox/uninbox/tree/main/ee for more information about the license'
  );
}

export default defineNitroConfig({
  // Nitro options
  runtimeConfig: {
    url: process.env.BILLING_URL,
    key: process.env.BILLING_KEY,
    stripeKey: process.env.BILLING_STRIPE_KEY
  }
});
