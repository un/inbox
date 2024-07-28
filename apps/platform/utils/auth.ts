import {
  type DatabaseSession,
  type DatabaseUser,
  Lucia,
  TimeSpan
} from 'lucia';
import { UnInboxDBAdapter } from './auth/adapter';
import type { TypeId } from '@u22n/utils/typeid';
import { COOKIE_SESSION } from './cookieNames';
import { env } from '~platform/env';

const adapter = new UnInboxDBAdapter();
const devMode = env.NODE_ENV === 'development';

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: devMode ? new TimeSpan(1, 'd') : new TimeSpan(4, 'w'),
  sessionCookie: {
    name: COOKIE_SESSION,
    attributes: {
      secure: !devMode,
      domain: env.PRIMARY_DOMAIN
    }
  },
  getSessionAttributes: ({ account }) => ({ account }),
  getUserAttributes: (user) => user
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
    DatabaseUserAttributes: DatabaseUserAttributes;
    UserId: number;
  }
  interface DatabaseSessionAttributes {
    account: AuthAccount;
    device: string;
    os: string;
  }
  interface DatabaseUserAttributes {
    id: number;
    publicId: TypeId<'account'>;
    username: string;
    passwordEnabled: boolean;
    totpEnabled: boolean;
    passkeyEnabled: boolean;
  }
}

export interface AuthAccount {
  id: number;
  publicId: TypeId<'account'>;
  username: string;
}

export interface AuthSession {
  sessionToken: string;
  account: AuthAccount;
  expiresAt: Date;
}

export function luciaToAuthUser(user: DatabaseUser) {
  return {
    id: user.attributes.id,
    publicId: user.attributes.publicId,
    username: user.attributes.username
  } as AuthAccount;
}

export function luciaToAuthSession(session: DatabaseSession) {
  return {
    sessionToken: session.id,
    account: session.attributes.account,
    expiresAt: session.expiresAt
  } as AuthSession;
}
