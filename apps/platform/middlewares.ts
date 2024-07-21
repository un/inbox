import { createMiddleware, getCookie } from '@u22n/hono/helpers';
import { COOKIE_SESSION } from './utils/cookieNames';
import { getTracer } from '@u22n/otel/helpers';
import { flatten } from '@u22n/otel/exports';
import { storage } from './storage';
import type { Ctx } from './ctx';
import { env } from './env';

const middlewareTracer = getTracer('platform/hono/middleware');

export const authMiddleware = createMiddleware<Ctx>(async (c, next) =>
  middlewareTracer.startActiveSpan('Auth Middleware', async (span) => {
    const sessionCookie = getCookie(c, COOKIE_SESSION);
    span?.setAttribute('req.auth.meta.has_cookie', !!sessionCookie);
    if (!sessionCookie) {
      c.set('account', null);
    } else {
      const sessionObject = await storage.session.getItem(sessionCookie);

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

export const serviceMiddleware = createMiddleware<Ctx>(async (c, next) =>
  middlewareTracer.startActiveSpan('Service Middleware', async (span) => {
    const authToken = c.req.header('Authorization');
    span?.setAttribute('req.service.meta.has_header', !!authToken);
    if (authToken !== env.WORKER_ACCESS_KEY) {
      return c.text('Unauthorized', 401);
    }
    await next();
  })
);
