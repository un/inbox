import { defineNitroConfig } from 'nitropack/config';

interface MailDomainEntries {
  name: string;
  postalId: string;
}

// TODO: ensure limits are pulled from the billing module
export default defineNitroConfig({
  // Nitro options
  // TODO: create runtimeconfig group keys to clean up this file
  runtimeConfig: {
    localMode: process.env.MAILBRIDGE_POSTAL_URL ? false : true,
    url: process.env.MAILBRIDGE_URL,
    key: process.env.MAILBRIDGE_KEY,
    postalUrl: process.env.MAILBRIDGE_POSTAL_URL || 'postal.localmode.local',
    postalRootUrl:
      process.env.MAILBRIDGE_POSTAL_ROOT_URL || 'postal.localmode.local',
    postalControlPanel:
      process.env.MAILBRIDGE_POSTAL_CONTROL_PANEL || 'postal.localmode.local',
    postalUser: process.env.MAILBRIDGE_POSTAL_USER || 'admin',
    postalPass: process.env.MAILBRIDGE_POSTAL_PASSWORD || 'password',
    postalDefaultIpPool:
      process.env.MAILBRIDGE_POSTAL_DEFAULT_IP_POOL || 'default',
    postalPersonalServerOrg:
      process.env.MAILBRIDGE_POSTAL_PERSONAL_SERVER_ORG || 'personal',
    postalWebhookPublicKey:
      process.env.MAILBRIDGE_POSTAL_WEBHOOK_PUBLIC_KEY || 'public',
    mailDomainPublic: JSON.parse(
      process.env.MAIL_DOMAIN_PUBLIC
    ) as MailDomainEntries[],
    mailDomainPremium: JSON.parse(
      process.env.MAIL_DOMAIN_PREMIUM
    ) as MailDomainEntries[],
    postalWebhookUrl:
      process.env.MAILBRIDGE_POSTAL_WEBHOOK_URL || process.env.MAILBRIDGE_URL,
    defaultLimits: {
      sendLimit: 15,
      messageRetentionDays: 14,
      outboundSpamThreshold: 5,
      rawMessageRetentionDays: 7,
      rawMessageRetentionSize: 512
    }
  }
});
