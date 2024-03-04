import { eq, inArray, lte } from 'drizzle-orm';

import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';
import { db } from '@uninbox/database';
import { sessions, users } from '@uninbox/database/schema';
import { useStorage } from '#imports';

//! Enable debug logging
const debug = true;
const log = (...args: any[]) => {
  if (debug) {
    console.log('🔐 Lucia Auth DB Adapter', ...args);
  }
};

export class UnInboxDBAdapter implements Adapter {
  constructor() {}

  public async deleteSession(sessionId: string): Promise<void> {
    log('deleteSession', { sessionId });
    await db
      .delete(sessions)
      .where(eq(sessions.sessionToken, sessionId))
      .execute();

    const sessionStorage = useStorage('sessions');
    sessionStorage.removeItem(sessionId);
  }

  public async deleteUserSessions(userId: string): Promise<void> {
    log('deleteUserSessions', { userId });
    const userPublicId = userId;
    const userOject = await db.query.users.findFirst({
      where: eq(users.publicId, userPublicId),
      columns: { id: true },
      with: {
        sessions: {
          columns: {
            sessionToken: true
          }
        }
      }
    });
    log('deleteUserSessions', { userOject });

    if (!userOject) {
      return;
    }
    const sessionIds = userOject?.sessions.map(
      (session) => session.sessionToken
    );

    if (sessionIds && sessionIds.length > 0) {
      await db
        .delete(sessions)
        .where(inArray(sessions.sessionToken, sessionIds))
        .execute();
    }

    const sessionStorage = useStorage('sessions');
    sessionIds.forEach((id) => {
      sessionStorage.removeItem(id);
    });
  }

  public async getSessionAndUser(
    sessionId: string
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    log('getSessionAndUser', { sessionId });
    //! verify this works

    const [databaseSession, databaseUser] = await Promise.all([
      this.getSession(sessionId),
      this.getUserFromSessionId(sessionId)
    ]);
    log('getSessionAndUser', { databaseSession, databaseUser });
    return [databaseSession, databaseUser];
  }

  public async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    log('getUserSessions', { userId });
    const userPublicId = userId;

    const userSessions = await db.query.sessions.findMany({
      where: eq(sessions.userPublicId, userPublicId),
      columns: {
        sessionToken: true,
        expiresAt: true,
        device: true,
        os: true
      },
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            publicId: true
          }
        }
      }
    });

    log('getUserSessions', { userSessions });

    const results: DatabaseSession[] = [];
    for (const session of userSessions) {
      results.push({
        id: session.sessionToken,
        userId: session.user.publicId,
        expiresAt: session.expiresAt,
        attributes: {
          device: session.device,
          os: session.os,
          user: {
            id: session.user.id,
            publicId: session.user.publicId,
            username: session.user.username
          }
        }
      });
    }
    return results;
  }

  public async setSession(session: DatabaseSession): Promise<void> {
    log('setSession', { session });
    const sessionStorage = useStorage('sessions');
    const userPublicId = session.userId;
    const userId = session.attributes.user.id;

    await db.insert(sessions).values({
      sessionToken: session.id,
      userPublicId: userPublicId,
      userId: userId,
      device: session.attributes.device,
      os: session.attributes.os,
      expiresAt: session.expiresAt
    });

    sessionStorage.setItem(session.id, session, {
      ttl:
        Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000) ||
        60 * 60 * 24
    });
  }

  public async updateSessionExpiration(
    sessionId: string,
    expiresAt: Date
  ): Promise<void> {
    log('updateSessionExpiration', { sessionId, expiresAt });
    const sessionStorage = useStorage('sessions');

    await db
      .update(sessions)
      .set({ expiresAt: expiresAt })
      .where(eq(sessions.sessionToken, sessionId))
      .execute();

    //! this needs to be tested - maybe it dosnt work
    const existingSession: DatabaseSession | null =
      await sessionStorage.getItem(sessionId);
    log('updateSessionExpiration', { existingSession });
    if (existingSession === null) {
      return;
    }
    sessionStorage.setItem(sessionId, existingSession, {
      ttl: Math.ceil((expiresAt.getTime() - Date.now()) / 1000) || 60 * 60 * 24
    });
    return;
  }

  public async deleteExpiredSessions(): Promise<void> {
    log('deleteExpiredSessions');
    await db
      .delete(sessions)
      .where(lte(sessions.expiresAt, new Date()))
      .execute();
  }

  private async getSession(sessionId: string): Promise<DatabaseSession | null> {
    log('getSession', { sessionId });
    const sessionStorage = useStorage('sessions');
    const sessionObject: DatabaseSession | null =
      await sessionStorage.getItem(sessionId);
    log('getSession', { sessionObject });
    return sessionObject;
  }

  private async getUserFromSessionId(
    sessionId: string
  ): Promise<DatabaseUser | null> {
    log('getUserFromSessionId', { sessionId });
    const sessionToken = sessionId;
    const userSessions = await db.query.sessions.findFirst({
      where: eq(sessions.sessionToken, sessionToken),
      columns: {
        id: true
      },
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            publicId: true
          },
          with: {
            account: {
              columns: {
                totpSecret: true
              }
            }
          }
        }
      }
    });
    log('getUserFromSessionId', { userSessions });
    if (!userSessions || !userSessions.user) return null;

    const result: DatabaseUser = {
      id: userSessions.user.publicId,
      attributes: {
        id: userSessions.user.id,
        publicId: userSessions.user.publicId,
        username: userSessions.user.username,
        twoFactorSecret: userSessions.user.account.totpSecret
      }
    };
    return result;
  }
}

// function transformIntoDatabaseSession(
//   raw: InferSelectModel<MySQLSessionTable>
// ): DatabaseSession {
//   const { id, userId, expiresAt, ...attributes } = raw;
//   return {
//     userId,
//     id,
//     expiresAt,
//     attributes,
//   };
// }

// function transformIntoDatabaseUser(
//   raw: InferSelectModel<MySQLUserTable>
// ): DatabaseUser {
//   const { id, ...attributes } = raw;
//   return {
//     id,
//     attributes,
//   };
// }
