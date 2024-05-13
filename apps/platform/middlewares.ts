import { getCookie } from 'hono/cookie';
import { storage } from './storage';
import { createMiddleware } from 'hono/factory';
import type { Ctx } from './ctx';

export const authMiddleware = createMiddleware<Ctx>(async (c, next) => {
  const sessionCookie = getCookie(c, 'unsession');
  if (!sessionCookie) {
    c.set('account', null);
    await next();
  } else {
    const sessionObject = await storage.session.getItem(sessionCookie);
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
