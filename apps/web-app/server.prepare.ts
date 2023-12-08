import { defineNuxtPrepareHandler } from 'nuxt-prepare/config';

export default defineNuxtPrepareHandler(async () => {
  // Do some async magic here, e.g. fetch data from an API

  // Get and store the Hanko jwks into runtime config
  const hankoUrl = process.env.WEBAPP_HANKO_API_URL;
  const hankoJwksResponse = hankoUrl
    ? await fetch(`${hankoUrl}/.well-known/jwks.json`).then(
        function (response) {
          return response.json();
        }
      )
    : '';

  // set the primary mail domains

  const mailDomainPublicEnv = process.env.MAIL_DOMAIN_PUBLIC;
  const mailDomainPremiumEnv = process.env.MAIL_DOMAIN_PREMIUM;
  if (!mailDomainPublicEnv || !mailDomainPremiumEnv) {
    throw new Error(
      'MAIL_DOMAIN_PUBLIC or MAIL_DOMAIN_PREMIUM is not set, you must add the domains to your ENV variables'
    );
  }

  // Check for EE license, enable billing functionality

  const eeConfig = {
    enabled: false,
    modules: {
      billing: false
    }
  };

  const billingConfig = {
    enabled: false,
    url: '',
    key: ''
  };

  const eeLicenseKey = process.env.EE_LICENSE_KEY;
  if (eeLicenseKey) {
    console.log('✅ Enterprise Edition is enabled');
    eeConfig.enabled = true;
  } else {
    console.log('✅ Running in self hosting mode 💪');
  }

  const billingUrl = process.env.BILLING_URL;
  const billingKey = process.env.BILLING_KEY;
  if (eeLicenseKey && billingUrl && billingKey) {
    console.log('✅ EE Billing module is enabled');
    eeConfig.modules.billing = true;
    billingConfig.enabled = true;
    billingConfig.url = billingUrl;
    billingConfig.key = billingKey;
  }

  return {
    runtimeConfig: {
      hankoJwks: hankoJwksResponse,
      billing: billingConfig,
      public: {
        mailDomainPublic: JSON.parse(
          mailDomainPublicEnv
        ) as MailDomainEntries[],
        mailDomainPremium: JSON.parse(
          mailDomainPremiumEnv
        ) as MailDomainEntries[],
        ee: eeConfig,
        turnstileEnabled: process.env.WEBAPP_TURNSTILE_SECRET_KEY !== ''
      }
    }
  };
});

export interface MailDomainEntries {
  name: string;
  postalId: string;
}
