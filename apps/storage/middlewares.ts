import { env } from './env';
import { storage } from './storage';
import type { Ctx } from './ctx';
import { createMiddleware, getCookie } from '@u22n/hono/helpers';

export const authMiddleware = createMiddleware<Ctx>(async (c, next) =>
  c.get('otel').tracer.startActiveSpan('authMiddleware', async (span) => {
    const sessionCookie = getCookie(c, 'unsession');
    span.setAttribute('session.has_cookie', !!sessionCookie);
    if (!sessionCookie) {
      c.set('account', null);
    } else {
      const sessionObject = await storage.getItem(sessionCookie);
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

// Middleware to check if user is signed in
export const checkSignedIn = createMiddleware<Ctx>(async (c, next) => {
  if (!c.get('account'))
    return c.json({ error: 'Unauthorized' }, { status: 401 });
  await next();
});

// Middleware to check if service is authorized (aka intra-service communication)
export const checkAuthorizedService = createMiddleware<Ctx>(async (c, next) => {
  const authToken = c.req.header('Authorization');
  if (!authToken || authToken !== env.STORAGE_KEY)
    return c.json({ error: 'Unauthorized' }, { status: 401 });
  await next();
});
