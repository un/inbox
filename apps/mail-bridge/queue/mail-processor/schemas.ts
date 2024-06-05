import { typeIdValidator } from '@u22n/utils/typeid';
import { z } from 'zod';

export const postalMessageSchema = z.object({
  id: z.number(),
  // We can't use z.string().email() here because the email address can be something like `*@domain.com` which is not a valid email
  rcpt_to: z.string().includes('@'),
  mail_from: z.string(),
  message: z.string(),
  base64: z.boolean(),
  size: z.number()
});

export type PostalMessageSchema = z.infer<typeof postalMessageSchema>;

export const mailParamsSchema = z.object({
  orgId: z.coerce.number(),
  mailserverId: z.enum(['root', 'fwd']).or(typeIdValidator('postalServers'))
});

export type MailParamsSchema = z.infer<typeof mailParamsSchema>;
