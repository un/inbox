import { createMiddleware, getCookie } from '@u22n/hono/helpers';
import { getTracer } from '@u22n/otel/helpers';
import { flatten } from '@u22n/otel/exports';
import { storage } from './storage';
import type { Ctx } from './ctx';
import { env } from './env';

const middlewareTracer = getTracer('storage/hono/middleware');

export const authMiddleware = createMiddleware<Ctx>(async (c, next) =>
  middlewareTracer.startActiveSpan('Auth Middleware', async (span) => {
    const sessionCookie = getCookie(c, 'un-session');
    span?.setAttribute('req.auth.meta.has_cookie', !!sessionCookie);
    if (!sessionCookie) {
      c.set('account', null);
    } else {
      const sessionObject = await storage.getItem(sessionCookie);

      if (sessionObject) {
        span?.setAttributes(
          flatten({
            'req.auth.meta': {
              account_public_id: sessionObject.attributes.account.publicId,
              account_username: sessionObject?.attributes.account.username
            }
          })
        );
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
export const checkAuthorizedService = createMiddleware<Ctx>(async (c, next) =>
  middlewareTracer.startActiveSpan('Service Middleware', (span) => {
    const authToken = c.req.header('Authorization');
    span?.setAttribute('req.service.meta.has_header', !!authToken);
    if (!authToken || authToken !== env.STORAGE_KEY)
      return c.json({ error: 'Unauthorized' }, { status: 401 });
    return next();
  })
);
