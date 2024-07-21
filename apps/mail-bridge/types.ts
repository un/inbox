// exported types
import { type trpcMailBridgeRouter } from './trpc';
export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;

export interface postalEmailPayload {
  id: number;
  rcpt_to: string;
  mail_from: string;
  message: string;
  base64: boolean;
  size: number;
}

export interface MessageParseAddressPlatformObject {
  id: number;
  type: 'contact' | 'emailIdentity';
  publicId: string;
  email: string;
  contactType:
    | 'person'
    | 'product'
    | 'newsletter'
    | 'marketing'
    | 'unknown'
    | null;
  ref: 'to' | 'cc' | 'from';
}

// Runtime Config Types
export interface MailDomains {
  free: string[];
  premium: string[];
  fwd: string[];
}

export interface EnvPostalServersObject {
  url: string;
  controlPanelSubDomain: string;
  ipv4: string;
  ipv6: string;
  webhookPubKey: string;
  dbConnectionString: string;
  defaultNewPool: string;
  active: boolean;
  routesDomain: string;
}

export interface EnvPostalServerPersonalCredentials {
  apiUrl: string;
  apiKey: string;
}

export interface EnvPostalServerLimits {
  messageRetentionDays: number;
  outboundSpamThreshold: number;
  rawMessageRetentionDays: number;
  rawMessageRetentionSize: number;
}

export interface EnvPostalWebhookDestinations {
  events: string;
  messages: string;
}

export type PostalConfig = {
  servers: EnvPostalServersObject[];
  activeServers: EnvPostalServersObject;
  personalServerCredentials: EnvPostalServerPersonalCredentials;
  dnsRootUrl: string;
  webhookDestinations: EnvPostalWebhookDestinations;
  limits: EnvPostalServerLimits;
  localMode: boolean;
};
