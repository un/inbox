import { sessions, accounts } from '@u22n/database/schema';
import { eq, inArray, lte } from '@u22n/database/orm';
import type { Adapter, DatabaseSession } from 'lucia';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { storage } from '~platform/storage';
import { db } from '@u22n/database';

const sessionStorage = storage.session;

export class UnInboxDBAdapter implements Adapter {
  public async deleteSession(sessionId: string) {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionId));
    await sessionStorage.removeItem(sessionId);
  }

  public async deleteUserSessions(accountId: number) {
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

    if (!accountObject) return;

    const sessionIds = accountObject.sessions.map(
      (session) => session.sessionToken
    );

    if (sessionIds.length > 0) {
      await db
        .delete(sessions)
        .where(inArray(sessions.sessionToken, sessionIds))
        .execute();
    }

    await Promise.allSettled(
      sessionIds.map((id) => sessionStorage.removeItem(id))
    );
  }

  public async getSessionAndUser(sessionId: string) {
    return Promise.all([
      this.getSession(sessionId),
      this.getUserFromSessionId(sessionId)
    ]);
  }

  public async getUserSessions(accountId: number) {
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

    return accountSessions.map((session) => ({
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
    }));
  }

  public async setSession(session: DatabaseSession) {
    const accountId = session.attributes.account.id;
    const accountPublicId = session.attributes.account.publicId;
    const sessionPublicId = typeIdGenerator('accountSession');

    await db.insert(sessions).values({
      publicId: sessionPublicId,
      sessionToken: session.id,
      accountPublicId: accountPublicId,
      accountId: accountId,
      device: session.attributes.device,
      os: session.attributes.os,
      expiresAt: session.expiresAt
    });

    await sessionStorage.setItem(session.id, session);
  }

  public async updateSessionExpiration(sessionId: string, expiresAt: Date) {
    await db
      .update(sessions)
      .set({ expiresAt: expiresAt })
      .where(eq(sessions.sessionToken, sessionId));
    const existingSession = await sessionStorage.getItem(sessionId);

    if (existingSession === null) return;

    await sessionStorage.setItem(sessionId, existingSession, {
      ttl: Math.ceil((expiresAt.getTime() - Date.now()) / 1000)
    });
  }

  public async deleteExpiredSessions() {
    await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }

  private async getSession(sessionId: string) {
    return await sessionStorage.getItem(sessionId);
  }

  private async getUserFromSessionId(sessionId: string) {
    const accountSessions = await db.query.sessions.findFirst({
      where: eq(sessions.sessionToken, sessionId),
      columns: {
        id: true
      },
      with: {
        account: {
          columns: {
            id: true,
            username: true,
            publicId: true,
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
    });

    if (!accountSessions?.account) return null;

    return {
      id: accountSessions.account.id,
      attributes: {
        id: accountSessions.account.id,
        publicId: accountSessions.account.publicId,
        username: accountSessions.account.username,
        passkeyEnabled: accountSessions.account.authenticators.length > 0,
        passwordEnabled: !!accountSessions.account.passwordHash,
        totpEnabled: !!accountSessions.account.twoFactorSecret
      }
    };
  }
}
