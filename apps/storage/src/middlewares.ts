import { env } from './env';
import { storage } from './storage';
import { getCookie } from 'hono/cookie';
import type { Ctx } from './ctx';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware<Ctx>(async (c, next) => {
  const sessionCookie = getCookie(c, 'unsession');
  if (!sessionCookie) {
    c.set('account', null);
    await next();
  } else {
    const sessionObject = await storage.getItem(sessionCookie);
    if (!sessionObject) {
      c.set('account', null);
      await next();
    } else {
      c.set('account', {
        // @ts-expect-error, not typed properly yet
        id: Number(sessionObject.attributes.account.id),
        session: sessionObject
      });
      await next();
    }
  }
});

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
