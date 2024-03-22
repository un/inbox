import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';
import { db } from '@u22n/database';
import { eq, inArray, lte } from '@u22n/database/orm';
import { sessions, accounts } from '@u22n/database/schema';
import { useStorage } from '#imports';

//! Enable debug logging
const debug = false;
const log = (...args: any[]) => {
  if (debug) {
    console.info('🔐 Lucia Auth DB Adapter', ...args);
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

  public async deleteUserSessions(accountId: number): Promise<void> {
    log('deleteUserSessions', { accountId });
    const accountObject = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
      columns: { id: true },
      with: {
        sessions: {
          columns: {
            sessionToken: true
          }
        }
      }
    });
    log('deleteUserSessions', { accountObject });

    if (!accountObject) {
      return;
    }
    const sessionIds = accountObject?.sessions.map(
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

  public async getUserSessions(accountId: number): Promise<DatabaseSession[]> {
    log('getUserSessions', { accountId });

    const accountSessions = await db.query.sessions.findMany({
      where: eq(sessions.accountId, accountId),
      columns: {
        sessionToken: true,
        expiresAt: true,
        device: true,
        os: true
      },
      with: {
        account: {
          columns: {
            id: true,
            username: true,
            publicId: true
          }
        }
      }
    });

    log('getUserSessions', { accountSessions });

    const results: DatabaseSession[] = [];
    for (const session of accountSessions) {
      results.push({
        id: session.sessionToken,
        userId: session.account.id,
        expiresAt: session.expiresAt,
        attributes: {
          device: session.device,
          os: session.os,
          account: {
            id: session.account.id,
            publicId: session.account.publicId,
            username: session.account.username
          }
        }
      });
    }
    return results;
  }

  public async setSession(session: DatabaseSession): Promise<void> {
    log('setSession', { session });
    const sessionStorage = useStorage('sessions');
    const accountId = session.attributes.account.id;
    const accountPublicId = session.attributes.account.publicId;

    await db.insert(sessions).values({
      sessionToken: session.id,
      accountPublicId: accountPublicId,
      accountId: accountId,
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
    const accountSessions = await db.query.sessions.findFirst({
      where: eq(sessions.sessionToken, sessionToken),
      columns: {
        id: true
      },
      with: {
        account: {
          columns: {
            id: true,
            username: true,
            publicId: true
          },
          with: {
            accountCredential: {
              columns: {
                twoFactorSecret: true,
                passwordHash: true
              },
              with: {
                authenticators: {
                  columns: {
                    nickname: true
                  }
                }
              }
            }
          }
        }
      }
    });
    log('getUserFromSessionId', { accountSessions });
    if (!accountSessions || !accountSessions.account) return null;

    const result: DatabaseUser = {
      id: accountSessions.account.id,
      attributes: {
        id: accountSessions.account.id,
        publicId: accountSessions.account.publicId,
        username: accountSessions.account.username,
        passkeyEnabled:
          accountSessions.account.accountCredential.authenticators.length > 0,
        passwordEnabled:
          !!accountSessions.account.accountCredential.passwordHash,
        totpEnabled: !!accountSessions.account.accountCredential.twoFactorSecret
      }
    };
    return result;
  }
}
