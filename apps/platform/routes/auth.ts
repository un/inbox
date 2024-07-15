import { Hono } from 'hono';
import type { Ctx } from '~platform/ctx';
import { lucia } from '~platform/utils/auth';
import { setCookie } from 'hono/cookie';
import { db } from '@u22n/database';
import { accounts } from '@u22n/database/schema';
import { eq } from '@u22n/database/orm';

export const authApi = new Hono<Ctx>();

authApi.get('/status', async (c) => {
  const account = c.get('account');
  if (!account) {
    return c.json({ authStatus: 'unauthenticated' });
  }
  return c.json({ authStatus: 'authenticated' });
});

authApi.get('/redirection', async (c) => {
  const account = c.get('account');
  if (!account) {
    return c.json({ defaultOrgShortCode: null }, 401);
  }

  const accountId = account.id;
  const accountResponse = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
    columns: {},
    with: {
      orgMemberships: {
        columns: {},
        with: {
          org: {
            columns: {
              shortcode: true
            }
          }
        }
      }
    }
  });

  if (!accountResponse) {
    return c.json({ error: 'User not found' }, 403);
  }

  return c.json({
    defaultOrgShortCode:
      accountResponse?.orgMemberships[0]?.org?.shortcode || null
  });
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
