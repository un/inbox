// exported types
import { trpcMailBridgeRouter } from './trpc';
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
  contactType:
    | 'person'
    | 'product'
    | 'newsletter'
    | 'marketing'
    | 'unknown'
    | null;
  ref: 'to' | 'cc' | 'from';
}
