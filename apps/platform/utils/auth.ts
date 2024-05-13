import {
  type DatabaseSession,
  type DatabaseUser,
  Lucia,
  TimeSpan
} from 'lucia';
import { UnInboxDBAdapter } from './auth/luciaDbAdaptor';
import type { TypeId } from '@u22n/utils';
import { env } from '../env';

const adapter = new UnInboxDBAdapter();
const devMode = env.NODE_ENV === 'development';

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: devMode ? new TimeSpan(1, 'd') : new TimeSpan(4, 'w'),
  sessionCookie: {
    name: 'unsession',
    attributes: {
      secure: !devMode,
      domain: env.PRIMARY_DOMAIN
    }
  },
  getSessionAttributes: (attributes) => {
    return {
      account: attributes.account
    };
  },
  getUserAttributes: (user) => {
    const {
      id,
      publicId,
      username,
      passkeyEnabled,
      passwordEnabled,
      totpEnabled
    } = user;
    return {
      id,
      publicId,
      username,
      passwordEnabled,
      totpEnabled,
      passkeyEnabled
    };
  }
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

export function luciaToAuthUser(user: DatabaseUser): AuthAccount {
  return {
    id: user.attributes.id,
    publicId: user.attributes.publicId,
    username: user.attributes.username
  };
}
export function luciaToAuthSession(session: DatabaseSession): AuthSession {
  return {
    sessionToken: session.id,
    account: session.attributes.account,
    expiresAt: session.expiresAt
  };
}
