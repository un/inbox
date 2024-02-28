import type { MailDomainEntries } from '@uninbox/types';
import { defineNuxtPrepareHandler } from 'nuxt-prepare/config';

export default defineNuxtPrepareHandler(async () => {
  // set the primary mail domains

  const mailDomainPublicEnv = process.env.MAIL_DOMAIN_PUBLIC;
  const mailDomainPremiumEnv = process.env.MAIL_DOMAIN_PREMIUM;
  if (!mailDomainPublicEnv || !mailDomainPremiumEnv) {
    throw new Error(
      'MAIL_DOMAIN_PUBLIC or MAIL_DOMAIN_PREMIUM is not set, you must add the domains to your ENV variables'
    );
  }

  // Check for EE license, enable billing functionality

  const billingConfig = {
    enabled: false,
    url: '',
    key: ''
  };
  const eeConfig = {
    enabled: false,
    modules: {
      billing: false
    }
  };

  const eeLicenseKey = process.env.EE_LICENSE_KEY || null;
  if (eeLicenseKey) {
    console.log('✅ Enterprise Edition is enabled');
    eeConfig.enabled = true;
  } else {
    console.log('✅ Running in self hosting mode 💪');
  }

  const billingUrl = process.env.BILLING_URL || null;
  const billingKey = process.env.BILLING_KEY || null;
  if (eeLicenseKey && billingUrl && billingKey) {
    console.log('✅ EE Billing module is enabled');
    eeConfig.modules.billing = true;
    billingConfig.enabled = true;
    billingConfig.url = billingUrl;
    billingConfig.key = billingKey;
  }

  const turnstileKey = process.env.WEBAPP_TURNSTILE_SECRET_KEY || null;

  const unBackendUrl = process.env.WEBAPP_BACKEND_URL;
  if (!unBackendUrl) {
    throw new Error(
      'WEBAPP_BACKEND_URL is not set, you must add the URL to your ENV variables'
    );
  } else {
    console.log('✅ Backend Url is set to', unBackendUrl);
  }

  return {
    runtimeConfig: {
      billing: billingConfig,
      public: {
        backendUrl: unBackendUrl,
        mailDomainPublic: JSON.parse(
          mailDomainPublicEnv
        ) as MailDomainEntries[],
        mailDomainPremium: JSON.parse(
          mailDomainPremiumEnv
        ) as MailDomainEntries[],
        ee: eeConfig,
        turnstileEnabled: !!turnstileKey
      }
    }
  };
});
