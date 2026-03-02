import { sessions, accounts } from '@u22n/database/schema';
import { eq, inArray, lte } from '@u22n/database/orm';
import { typeIdGenerator, type TypeId } from '@u22n/utils/typeid';
import { setCookie, type Context } from '@u22n/hono/helpers';
import { COOKIE_SESSION } from '~platform/utils/cookieNames';
import { storage } from '~platform/storage';
import { db } from '@u22n/database';
import { UAParser } from 'ua-parser-js';
import { randomBytes } from 'node:crypto';
import { env } from '~platform/env';
import { seconds } from '@u22n/utils/ms';

export type AuthAccount = {
  id: number;
  publicId: TypeId<'account'>;
  username: string;
};

export type AppSession = {
  id: string;
  userId: number;
  expiresAt: Date;
  attributes: {
    account: AuthAccount;
    device: string;
    os: string;
  };
};

function getSessionTtlSeconds(): number {
  return env.NODE_ENV === 'development'
    ? seconds('12 hours')
    : seconds('30 days');
}

function getSessionExpiry(): Date {
  return new Date(Date.now() + getSessionTtlSeconds() * 1000);
}

export const sessionManager = {
  async createSession(
    accountId: number,
    attributes: { account: AuthAccount; device: string; os: string }
  ): Promise<AppSession> {
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = getSessionExpiry();
    const sessionPublicId = typeIdGenerator('accountSession');

    const session: AppSession = {
      id: sessionToken,
      userId: accountId,
      expiresAt,
      attributes
    };

    await db.insert(sessions).values({
      publicId: sessionPublicId,
      sessionToken,
      accountPublicId: attributes.account.publicId,
      accountId,
      device: attributes.device,
      os: attributes.os,
      expiresAt
    });

    await storage.session.setItem(sessionToken, session);
    return session;
  },

  async validateSession(token: string): Promise<AppSession | null> {
    const session = await storage.session.getItem(token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      await this.invalidateSession(token);
      return null;
    }
    return session;
  },

  async invalidateSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
    await storage.session.removeItem(token);
  },

  async invalidateUserSessions(accountId: number): Promise<void> {
    const accountData = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
      columns: { id: true },
      with: { sessions: { columns: { sessionToken: true } } }
    });
    if (!accountData) return;

    const tokenIds = accountData.sessions.map((s) => s.sessionToken);
    if (tokenIds.length > 0) {
      await db
        .delete(sessions)
        .where(inArray(sessions.sessionToken, tokenIds));
    }
    await Promise.allSettled(
      tokenIds.map((id) => storage.session.removeItem(id))
    );
  },

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  },

  createSessionCookie(token: string) {
    return {
      name: COOKIE_SESSION,
      value: token,
      attributes: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        domain: env.PRIMARY_DOMAIN,
        path: '/',
        maxAge: getSessionTtlSeconds()
      }
    };
  },

  createBlankSessionCookie() {
    return {
      name: COOKIE_SESSION,
      value: '',
      attributes: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        domain: env.PRIMARY_DOMAIN,
        path: '/',
        maxAge: 0
      }
    };
  }
};

export async function createSessionCookie(
  event: Context,
  info: { accountId: number; username: string; publicId: TypeId<'account'> }
): Promise<AppSession> {
  const { device, os, browser } = UAParser(event.req.header('User-Agent'));
  const userDevice =
    device.type === 'mobile'
      ? device.toString()
      : (device.vendor ?? device.model ?? device.type ?? 'Unknown');

  const { accountId, username, publicId } = info;
  const session = await sessionManager.createSession(accountId, {
    account: { id: accountId, username, publicId },
    device: userDevice,
    os: `${browser.toString()} ${os.name ?? 'Unknown'}`
  });

  const cookie = sessionManager.createSessionCookie(session.id);
  setCookie(event, cookie.name, cookie.value, cookie.attributes);

  await db
    .update(accounts)
    .set({ lastLoginAt: new Date() })
    .where(eq(accounts.id, accountId));

  return session;
}
