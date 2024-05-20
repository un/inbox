import { Hono } from 'hono';
import type { Ctx } from '~platform/ctx';
import { lucia } from '~platform/utils/auth';
import { setCookie } from 'hono/cookie';

export const authApi = new Hono<Ctx>();

authApi.get('/status', async (c) => {
  const account = c.get('account');
  if (!account) {
    return c.json({ authStatus: 'unauthenticated' });
  }
  return c.json({ authStatus: 'authenticated' });
});

authApi.post('/logout', async (c) => {
  const account = c.get('account');
  if (!account) {
    return c.json({ ok: true });
  }
  const sessionId = account.session.id;
  await lucia.invalidateSession(sessionId);
  const cookie = lucia.createBlankSessionCookie();
  setCookie(c, cookie.name, cookie.value, cookie.attributes);
  return c.json({ ok: true });
});
