import { validatePostalWebhookSignature } from '../utils/validatePostalWebhookSignature';
import { createMiddleware } from '@u22n/hono/helpers';
import { getTracer } from '@u22n/otel/helpers';
import { flatten } from '@u22n/otel/exports';
import type { Ctx } from '../ctx';
import { env } from '../env';

const middlewareTracer = getTracer('mail-bridge/hono/middleware');

export const signatureMiddleware = createMiddleware<Ctx>(async (c, next) =>
  middlewareTracer.startActiveSpan(
    'Postal Signature Middleware',
    async (span) => {
      if (c.req.method !== 'POST') {
        span?.recordException(new Error(`Method not allowed, ${c.req.method}`));
        return c.json({ message: 'Method not allowed' }, 405);
      }
      const body = (await c.req.json().catch(() => ({}))) as unknown;
      const signature = c.req.header('x-postal-signature');
      if (!signature) {
        span?.recordException(new Error('Missing signature'));
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
        span?.setAttributes(
          flatten({
            'req.signature.meta': {
              valid: false,
              body: body,
              signature: signature
            }
          })
        );
        span?.recordException(new Error('Invalid signature'));
        return c.json({ message: 'Invalid signature' }, 401);
      }
      span?.setAttribute('req.signature.meta.valid', true);

      await next();
    }
  )
);
