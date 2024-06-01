import { getCookie } from 'hono/cookie';
import { storage } from './storage';
import { createMiddleware } from 'hono/factory';
import type { Ctx } from './ctx';

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
