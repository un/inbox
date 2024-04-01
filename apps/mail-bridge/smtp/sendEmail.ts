import { createTransport } from 'nodemailer';
import type { AuthOptions } from './auth';

export type SendEmailOptions = {
  to: string[];
  cc: string[];
  from: string;
  sender: string;
  subject: string;
  plainBody: string;
  htmlBody: string;
  attachments: {
    name: string;
    content_type: string;
    data: string;
    base64: boolean;
  }[];
  headers: Record<string, string>;
};

export async function sendEmail({
  auth: { host, port, username, password, encryption, authMethod },
  email: {
    to,
    cc,
    from,
    sender,
    subject,
    plainBody,
    htmlBody,
    attachments,
    headers
  }
}: {
  auth: AuthOptions;
  email: SendEmailOptions;
}) {
  const transport = createTransport({
    host,
    port,
    secure: encryption === 'ssl' || encryption === 'tls',
    auth: {
      user: username,
      pass: password,
      method: authMethod.toUpperCase()
    }
  });
  const res = await transport.sendMail({
    envelope: {
      to,
      from
    },
    to,
    cc,
    from,
    sender,
    subject,
    html: htmlBody,
    text: plainBody,
    attachments: attachments.map(({ name, content_type, data, base64 }) => ({
      contentType: content_type,
      filename: name,
      content: data,
      encoding: base64 ? 'base64' : 'utf8'
    })),
    headers
  });
  return res;
}
