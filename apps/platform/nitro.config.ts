//https://nitro.unjs.io/config
import { defineNitroConfig } from 'nitropack/config';

interface MailDomains {
  free: string[];
  premium: string[];
}

const mailDomains: MailDomains = JSON.parse(process.env.MAIL_DOMAINS);
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

export default defineNitroConfig({
  imports: {
    autoImport: false
  },
  runtimeConfig: {
    primaryDomain: process.env.PRIMARY_DOMAIN || 'localhost',
    auth: {
      baseUrl: process.env.WEBAPP_URL || 'http://localhost:3000',
      secret: process.env.WEBAPP_AUTH_SECRET,
      passkeys: {
        rpName: process.env.APP_NAME || 'UnInbox',
        rpID: process.env.PRIMARY_DOMAIN || 'localhost',
        origin: process.env.WEBAPP_URL || 'http://localhost:3000'
      }
    },
    realtime: {
      host: process.env.PLATFORM_REALTIME_HOST || '',
      port: process.env.PLATFORM_REALTIME_PORT || '',
      appId: process.env.PLATFORM_REALTIME_APP_ID || '',
      appKey: process.env.PLATFORM_REALTIME_APP_KEY || '',
      appSecret: process.env.PLATFORM_REALTIME_APP_SECRET || ''
    },
    mailBridge: {
      url: process.env.WEBAPP_MAILBRIDGE_URL || '',
      key: process.env.WEBAPP_MAILBRIDGE_KEY || '',
      postalRootUrl: process.env.MAILBRIDGE_POSTAL_ROOT_URL || ''
    },
    storage: {
      url: process.env.WEBAPP_STORAGE_URL || '',
      key: process.env.WEBAPP_STORAGE_KEY || ''
    },
    // public: {
    //   siteUrl: process.env.WEBAPP_URL || '',
    //   storageUrl: process.env.WEBAPP_STORAGE_URL || '',
    //   mailDomainPublic: JSON.parse(mailDomainPublicEnv),
    //   mailDomainPremium: JSON.parse(mailDomainPremiumEnv),
    //   ee: eeConfig,
    //   turnstileEnabled: !!turnstileKey
    // },
    turnstile: {
      secretKey: process.env.WEBAPP_TURNSTILE_SECRET_KEY || ''
    },
    billing: billingConfig
  }
});
