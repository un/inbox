// exported types
import { trpcMailBridgeRouter } from './trpc';
export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;

export interface postalEmailPayload {
  id: number;
  rcpt_to: string;
  mail_from: string;
  token: string;
  subject: string;
  message_id: string;
  timestamp: number;
  size: string;
  spam_status: 'Spam' | 'NotSpam';
  bounce: boolean;
  received_with_ssl: boolean | null;
  to: string;
  cc: string | null;
  from: string;
  date: string;
  in_reply_to: string | null;
  references: string | null;
  plain_body: string;
  html_body: string;
  auto_submitted:
    | 'no'
    | 'auto-generated'
    | 'auto-replied'
    | 'auto-notified'
    | null;
  attachment_quantity: number;
  attachments: PostalEmailAttachment[] | [];
  replies_from_plain_body?: string | null;
}

export interface PostalEmailAttachment {
  filename: string;
  content_type: string;
  size: number;
  data: string;
}
