import { defineNuxtPrepareHandler } from 'nuxt-prepare/config';

export default defineNuxtPrepareHandler(async () => {
  // set the primary mail domains

  interface MailDomains {
    free: string[];
    premium: string[];
  }

  const mailDomains: MailDomains = JSON.parse(process.env.MAIL_DOMAINS || '');
  if (!mailDomains.free || !mailDomains.premium) {
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
    console.info('✅ Enterprise Edition is enabled');
    eeConfig.enabled = true;
  } else {
    console.info('✅ Running in self hosting mode 💪');
  }

  const billingUrl = process.env.BILLING_URL || null;
  const billingKey = process.env.BILLING_KEY || null;
  if (eeLicenseKey && billingUrl && billingKey) {
    console.info('✅ EE Billing module is enabled');
    eeConfig.modules.billing = true;
    billingConfig.enabled = true;
    billingConfig.url = billingUrl;
    billingConfig.key = billingKey;
  }

  const unPlatformUrl = process.env.PLATFORM_URL;
  if (!unPlatformUrl) {
    throw new Error(
      'PLATFORM_URL is not set, you must add the URL to your ENV variables'
    );
  } else {
    console.info('✅ Platform URL is set to', unPlatformUrl);
  }

  return {
    runtimeConfig: {
      billing: billingConfig,
      public: {
        mailDomains: mailDomains,
        ee: eeConfig
      }
    }
  };
});
