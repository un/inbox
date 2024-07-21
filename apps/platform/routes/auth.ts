import { accounts } from '@u22n/database/schema';
import { setCookie } from '@u22n/hono/helpers';
import { lucia } from '~platform/utils/auth';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '~platform/ctx';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';

export const authApi = createHonoApp<Ctx>();

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
    return c.json({ defaultOrgShortcode: null }, 401);
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
    defaultOrgShortcode:
      accountResponse?.orgMemberships[0]?.org?.shortcode ?? null
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
