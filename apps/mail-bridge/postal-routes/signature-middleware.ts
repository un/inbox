import { env } from '../env';
import { validatePostalWebhookSignature } from '../utils/validatePostalWebhookSignature';
import type { Ctx } from '../ctx';
import { createMiddleware } from '@u22n/hono/helpers';

export const signatureMiddleware = createMiddleware<Ctx>(async (c, next) =>
  c
    .get('otel')
    .tracer.startActiveSpan('Postal Signature Middleware', async (span) => {
      if (c.req.method !== 'POST') {
        span.recordException(`Method not allowed, ${c.req.method}`);
        span.end();
        return c.json({ message: 'Method not allowed' }, 405);
      }
      const body = await c.req.json().catch(() => ({}));
      const signature = c.req.header('x-postal-signature');
      if (!signature) {
        span.recordException(`Missing signature`);
        span.end();
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
        span.recordException('Invalid signature');
        span.setAttributes({
          'signature.valid': false,
          'signature.availableKeys': publicKeys,
          'signature.signature': signature
        });
        span.end();
        return c.json({ message: 'Invalid signature' }, 401);
      }
      span.setAttribute('signature.valid', true);
      span.end();
      await next();
    })
);
