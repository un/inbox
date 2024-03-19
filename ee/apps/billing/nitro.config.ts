import { defineNitroConfig } from 'nitropack/config';
import type { StripeData } from './types';

const eeLicenseKey = process.env.EE_LICENSE_KEY;
const appUrl = process.env.WEBAPP_URL;

async function validateLicenseKey(key: string, appUrl: string) {
  const response = await fetch('https://ee.u22n.com/api/license/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, appUrl })
  }).then((response: any) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  });

  if (!response.valid) {
    throw new Error(
      '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
    );
  }
  return true;
}

if (eeLicenseKey && appUrl) {
  validateLicenseKey(eeLicenseKey, appUrl).catch((error) => {
    console.error(error);
    throw new Error(
      '🚨 Something went wrong when trying to validate the license key. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
    );
  });
} else {
  throw new Error(
    '🚨 You are attempting to run software that requires a paid license but have not provided a valid license key or app url. Please check https://github.com/un/inbox/tree/main/ee for more information about the license'
  );
}

const stripeData: StripeData = {
  plans: {
    starter: {
      monthly: process.env.BILLING_STRIPE_PLAN_STARTER_MONTHLY_ID || '',
      yearly: process.env.BILLING_STRIPE_PLAN_STARTER_YEARLY_ID || ''
    },
    pro: {
      monthly: process.env.BILLING_STRIPE_PLAN_PRO_MONTHLY_ID || '',
      yearly: process.env.BILLING_STRIPE_PLAN_PRO_YEARLY_ID || ''
    }
  },
  key: process.env.BILLING_STRIPE_KEY || '',
  webhookKey: process.env.BILLING_STRIPE_WEBHOOK_KEY || ''
};

export default defineNitroConfig({
  // Nitro options
  runtimeConfig: {
    url: process.env.BILLING_URL,
    key: process.env.BILLING_KEY,
    appUrl: process.env.WEBAPP_URL,
    stripe: stripeData
    // stripeKey: process.env.BILLING_STRIPE_KEY
  }
});
