import { postalServers } from '@u22n/database/schema';
import { defineNitroConfig } from 'nitropack/config';

interface MailDomains {
  free: string[];
  premium: string[];
}

interface EnvPostalServersObject {
  url: string;
  controlPanelSubDomain: string;
  ipv4: string;
  ipv6: string;
  webhookPubKey: string;
  cpUsername: string;
  cpPassword: string;
  dbConnectionString: string;
  defaultNewPool: string;
  active: boolean;
}

interface EnvPostalServerPersonalCredentials {
  apiUrl: string;
  apiKey: string;
}

interface EnvPostalServerLimits {
  messageRetentionDays: number;
  outboundSpamThreshold: number;
  rawMessageRetentionDays: number;
  rawMessageRetentionSize: number;
}

interface EnvPostalWebhookDestinations {
  events: string;
  messages: string;
}

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
    localMode: process.env.MAILBRIDGE_LOCAL_MODE || true,
    url: process.env.MAILBRIDGE_URL,
    key: process.env.MAILBRIDGE_KEY,
    postal: {
      servers: postalServersArray,
      activeServers: activePostalServer,
      personalServerCredentials: postalServerPersonalCredentials,
      dnsRootUrl: process.env.MAILBRIDGE_POSTAL_SERVERS_DNS_ROOT_URL,
      webhookDestinations: webhookDestinations,
      limits: postalServerLimits
    },
    mailDomains: mailDomains
  }
});
