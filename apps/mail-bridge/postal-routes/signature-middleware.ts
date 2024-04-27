import { env } from '../env';
import { createMiddleware } from 'hono/factory';
import { validatePostalWebhookSignature } from '../utils/validatePostalWebhookSignature';

export const signatureMiddleware = createMiddleware(async (c, next) => {
  if (c.req.method !== 'POST') {
    return c.json({ message: 'Method not allowed' }, 405);
  }
  const body = await c.req.json().catch(() => ({}));
  const signature = c.req.header('x-postal-signature');
  if (!signature) {
    return c.json({ message: 'Missing signature' }, 401);
  }
  const publicKeys = env.MAILBRIDGE_POSTAL_SERVERS.map(
    (server) => server.webhookPubKey
  );
  const valid = await validatePostalWebhookSignature(
    body,
    signature,
    publicKeys
  );
  if (!valid) {
    console.error('Failed postal webhook call with these headers', {
      headers: c.req.header()
    });
    console.error('Postal verify webhook', { publicKeys });
    console.error('signature', { signature });
    return c.json({ message: 'Invalid signature' }, 401);
  }

  await next();
});
