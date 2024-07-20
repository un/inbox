import { createMiddleware, getCookie } from '@u22n/hono/helpers';
import { storage } from './storage';
import type { Ctx } from './ctx';
import { env } from './env';

export const authMiddleware = createMiddleware<Ctx>(async (c, next) =>
  c.get('otel').tracer.startActiveSpan('authMiddleware', async (span) => {
    const sessionCookie = getCookie(c, 'unsession');
    span.setAttribute('session.has_cookie', !!sessionCookie);
    if (!sessionCookie) {
      c.set('account', null);
    } else {
      const sessionObject = await storage.session.getItem(sessionCookie);
      span.setAttribute('session.found_in_db', !!sessionObject);
      if (sessionObject) {
        span.setAttributes({
          'session.account_public_id':
            sessionObject.attributes.account.publicId,
          'session.account_username': sessionObject?.attributes.account.username
        });
      }
      c.set(
        'account',
        !sessionObject
          ? null
          : {
              id: sessionObject.attributes.account.id,
              session: sessionObject
            }
      );
    }
    span.end();
    return next();
  })
);

export const serviceMiddleware = createMiddleware<Ctx>(async (c, next) =>
  c.get('otel').tracer.startActiveSpan('serviceMiddleware', async (span) => {
    const authToken = c.req.header('Authorization');
    span.setAttribute('auth.has_header', !!authToken);
    if (authToken !== env.WORKER_ACCESS_KEY) {
      span.end();
      return c.text('Unauthorized', 401);
    }
    span.end();
    return next();
  })
);
