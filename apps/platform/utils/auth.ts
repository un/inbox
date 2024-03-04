import { DatabaseSession, DatabaseUser, Lucia, TimeSpan } from 'lucia';
import { UnInboxDBAdapter } from './auth/luciaDbAdaptor';
import { useRuntimeConfig } from '#imports';

const adapter = new UnInboxDBAdapter();
const config = useRuntimeConfig();
const devMode = import.meta.dev;

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: devMode ? new TimeSpan(1, 'd') : new TimeSpan(4, 'w'),
  sessionCookie: {
    name: 'unsession',
    attributes: {
      secure: !import.meta.dev,
      domain: config.primaryDomain
    }
  },
  getSessionAttributes: (attributes) => {
    return {
      user: attributes.user
    };
  },
  getUserAttributes: (user) => {
    return {
      id: user.id,
      publicId: user.publicId,
      username: user.username,
      twoFactorEnabled: user.twoFactorSecret !== null
    };
  }
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
  interface DatabaseSessionAttributes {
    user: AuthUser;
    device: string;
    os: string;
  }
  interface DatabaseUserAttributes {
    id: number;
    publicId: string;
    username: string;
    twoFactorSecret: string | null;
  }
}

export interface AuthUser {
  id: number;
  publicId: string;
  username: string;
}

export interface AuthSession {
  sessionToken: string;
  user: AuthUser;
  expiresAt: Date;
}

export function luciaToAuthUser(user: DatabaseUser): AuthUser {
  return {
    id: user.attributes.id,
    publicId: user.attributes.publicId,
    username: user.attributes.username
  };
}
export function luciaToAuthSession(session: DatabaseSession): AuthSession {
  return {
    sessionToken: session.id,
    user: session.attributes.user,
    expiresAt: session.expiresAt
  };
}
