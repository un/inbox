import { setCookie, type Context } from '@u22n/hono/helpers';
import { accounts } from '@u22n/database/schema';
import type { TypeId } from '@u22n/utils/typeid';
import { eq } from '@u22n/database/orm';
import { UAParser } from 'ua-parser-js';
import { db } from '@u22n/database';
import { lucia } from './auth';

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
      : device.vendor ?? device.model ?? device.type ?? 'Unknown';
  const { accountId, username, publicId } = info;
  const accountSession = await lucia.createSession(accountId, {
    account: {
      id: accountId,
      username,
      publicId
    },
    device: userDevice,
    os: `${browser.toString()} ${os.name ?? 'Unknown'}`
  });
  const cookie = lucia.createSessionCookie(accountSession.id);
  setCookie(event, cookie.name, cookie.value, cookie.attributes);
  await db
    .update(accounts)
    .set({ lastLoginAt: new Date() })
    .where(eq(accounts.id, accountId));
  return cookie;
}
