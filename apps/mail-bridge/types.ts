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
