import { createTransport } from 'nodemailer';
import type { AuthOptions } from './auth';

export type SendEmailOptions = {
  to: string[];
  from: string;
  raw: string;
};

export async function sendEmail({
  auth: { host, port, username, password, encryption, authMethod },
  email: { to, from, raw }
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
    envelope: { to, from },
    raw
  });
  return res;
}
