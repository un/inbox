import { DatabaseSession, DatabaseUser, Lucia } from 'lucia';
import { UnInboxDBAdapter } from './auth/luciaDbAdaptor';

const adapter = new UnInboxDBAdapter();

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: 'unsession',
    attributes: {
      secure: !import.meta.dev
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
      username: user.username
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
    browser: string;
    device: string;
  }
  interface DatabaseUserAttributes {
    id: number;
    publicId: string;
    username: string;
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
