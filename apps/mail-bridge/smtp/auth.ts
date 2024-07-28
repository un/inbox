import { createTransport } from 'nodemailer';

export type AuthOptions = {
  host: string;
  port?: number;
  username: string;
  password: string;
  encryption: 'ssl' | 'tls' | 'starttls' | 'none';
  authMethod: 'plain' | 'login';
};

export async function validateSmtpCredentials({
  host,
  port,
  username,
  password,
  encryption,
  authMethod
}: AuthOptions) {
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
  const status = await transport
    .verify()
    .then(() => ({ valid: true, error: null }) as const)
    .catch(
      (e: Error) =>
        ({
          valid: false,
          error: e.message
        }) as const
    );
  transport.close();
  return status;
}
