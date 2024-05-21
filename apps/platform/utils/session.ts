import { UAParser } from 'ua-parser-js';
import { lucia } from './auth';
import type { TypeId } from '@u22n/utils/typeid';
import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { db } from '@u22n/database';
import { accounts } from '@u22n/database/schema';
import { eq } from '@u22n/database/orm';

type SessionInfo = {
  accountId: number;
  username: string;
  publicId: TypeId<'account'>;
};

/**
 * Create a Lucia session cookie for given session info, set the cookie in for the event, update last login and return the cookie.
 */
export async function createLuciaSessionCookie(
  event: Context,
  info: SessionInfo
) {
  const { device, os, browser } = UAParser(event.req.header('User-Agent'));
  const userDevice =
    device.type === 'mobile'
      ? device.toString()
      : device.vendor || device.model || device.type || 'Unknown';
  const { accountId, username, publicId } = info;
  const accountSession = await lucia.createSession(accountId, {
    account: {
      id: accountId,
      username,
      publicId
    },
    device: userDevice,
    os: `${browser.toString()} ${os.name || 'Unknown'}`
  });
  const cookie = lucia.createSessionCookie(accountSession.id);
  setCookie(event, cookie.name, cookie.value, cookie.attributes);
  await db
    .update(accounts)
    .set({ lastLoginAt: new Date() })
    .where(eq(accounts.id, accountId));
  return cookie;
}
