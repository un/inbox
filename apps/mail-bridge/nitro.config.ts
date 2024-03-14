import { defineNitroConfig } from 'nitropack/config';
import type {
  EnvPostalServersObject,
  EnvPostalServerPersonalCredentials,
  EnvPostalServerLimits,
  EnvPostalWebhookDestinations,
  MailDomains
} from './types';

const postalServersArray: EnvPostalServersObject[] = JSON.parse(
  process.env.MAILBRIDGE_POSTAL_SERVERS
);
const activePostalServer = postalServersArray.find((server) => server.active);

const postalServerPersonalCredentials: EnvPostalServerPersonalCredentials =
  JSON.parse(process.env.MAILBRIDGE_POSTAL_SERVER_PERSONAL_CREDENTIALS);

const postalServerLimits: EnvPostalServerLimits = JSON.parse(
  process.env.MAILBRIDGE_POSTAL_SERVER_LIMITS
);
const webhookDestinations: EnvPostalWebhookDestinations = JSON.parse(
  process.env.MAILBRIDGE_POSTAL_WEBHOOK_DESTINATIONS
);

const mailDomains: MailDomains = JSON.parse(process.env.MAIL_DOMAINS);

// TODO: ensure limits are pulled from the billing module
export default defineNitroConfig({
  // Nitro options
  runtimeConfig: {
    url: process.env.MAILBRIDGE_URL,
    key: process.env.MAILBRIDGE_KEY,
    postal: {
      servers: postalServersArray,
      activeServers: activePostalServer,
      personalServerCredentials: postalServerPersonalCredentials,
      dnsRootUrl: process.env.MAILBRIDGE_POSTAL_SERVERS_DNS_ROOT_URL,
      webhookDestinations: webhookDestinations,
      limits: postalServerLimits,
      localMode: process.env.MAILBRIDGE_LOCAL_MODE || true
    },
    storage: {
      url: process.env.WEBAPP_STORAGE_URL || '',
      key: process.env.WEBAPP_STORAGE_KEY || ''
    },
    mailDomains: mailDomains
  }
});
