import { and, eq } from 'drizzle-orm';
import { db } from '@uninbox/database';
import { users, accounts, authenticators } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';

import type {
  Adapter,
  AdapterAccount,
  AdapterAuthenticator,
  AdapterSession,
  AdapterUser,
  VerificationToken
} from '@auth/core/adapters';

//! Enable debug logging
const debug = false;
const log = (...args: any[]) => {
  if (debug) {
    console.log(...args);
  }
};

export function customDrizzleAdapter(): Adapter {
  return {
    async createUser(user) {
      log('👀 createUser', { user });
      let username: string;
      let email: string;

      if (user.email.includes(':')) {
        username = user.email.split(':')[0];
        email = user.email.split(':')[1];
      } else {
        username = user.email;
        email = user.email;
      }
      if (!username) {
        throw new Error('No username provided.');
      }

      const publicId = nanoId();
      const createUserResponse = await db.insert(users).values({
        username: username,
        recoveryEmail: email,
        publicId,
        emailVerified: user.emailVerified
      });

      return {
        id: createUserResponse.insertId.toString(),
        idNumber: +createUserResponse.insertId,
        name: username,
        email: email,
        image: null,
        emailVerified: user.emailVerified,
        publicId: publicId,
        recoveryEmail: email,
        username: username
      } as AdapterUser;
    },
    async getUser(id) {
      log('👀 getUser', { id });
      const userData = await db.query.users.findFirst({
        where: eq(users.id, +id),
        columns: {
          id: true,
          publicId: true,
          username: true,
          recoveryEmail: true,
          emailVerified: true
        }
      });

      if (!userData) {
        return null;
      }

      return {
        id: userData.id.toString(),
        idNumber: userData.id,
        username: userData?.username,
        recoveryEmail: userData?.recoveryEmail,
        emailVerified: userData?.emailVerified,
        publicId: userData?.publicId,
        email: userData?.recoveryEmail
      } as AdapterUser;
    },
    async updateUser(user) {
      log('👀 updateUser', { user });
      if (!user.id || !user.idNumber) {
        throw new Error('No user id.');
      }

      const updatedUser = {
        ...(user.name && { username: user.name }),
        ...(user.email && { recoveryEmail: user.email }),
        ...(user.emailVerified && { emailVerified: user.emailVerified })
      };
      if (Object.keys(updatedUser).length !== 0) {
        await db.update(users).set(updatedUser).where(eq(users.id, +user.id));
      }

      return {
        id: user.id,
        idNumber: user.idNumber,
        publicId: user.publicId,
        name: user.name,
        username: user.username,
        email: user.email,
        recoveryEmail: user.recoveryEmail,
        emailVerified: user.emailVerified
      } as AdapterUser;
    },
    async getUserByEmail(userEmail) {
      log('👀 getUserByEmail', { userEmail });
      let username: string;
      let email: string;
      if (userEmail.includes(':')) {
        username = userEmail.split(':')[0];
        email = userEmail.split(':')[1];
      } else {
        username = userEmail;
        email = userEmail;
      }
      const userData = await db.query.users.findFirst({
        where: eq(users.recoveryEmail, email),
        columns: {
          id: true,
          publicId: true,
          username: true,
          recoveryEmail: true,
          emailVerified: true
        }
      });
      log('👀 getUserByEmail userData', userData);
      if (!userData) {
        return null;
      }

      return {
        id: userData.id.toString(),
        idNumber: userData.id,
        publicId: userData.publicId,
        name: userData.username,
        username: userData.username,
        email: userData.recoveryEmail,
        recoveryEmail: userData.recoveryEmail,
        emailVerified: userData.emailVerified
      } as AdapterUser;
    },
    async getUserByAccount(providerAccount) {
      log('👀 getUserByAccount', { providerAccount });
      const accountResponse = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.providerAccountId, providerAccount.providerAccountId),
          eq(accounts.provider, providerAccount.provider)
        ),
        columns: {},
        with: {
          user: {
            columns: {
              id: true,
              publicId: true,
              username: true,
              recoveryEmail: true,
              emailVerified: true
            }
          }
        }
      });

      if (!accountResponse || !accountResponse.user) {
        return null;
      }

      return {
        id: accountResponse.user.id.toString(),
        idNumber: accountResponse.user.id,
        publicId: accountResponse.user.publicId,
        name: accountResponse.user.username,
        username: accountResponse.user.username,
        email: accountResponse.user.recoveryEmail,
        recoveryEmail: accountResponse.user.recoveryEmail,
        emailVerified: accountResponse.user.emailVerified
      } as AdapterUser;
    },
    async deleteUser(id) {
      log('👀 deleteUser', { id });
      // const userData = await db.query.users.findFirst({
      //   where: eq(users.id, +id),
      //   columns: {
      //     id: true,
      //     publicId: true,
      //     username: true,
      //     recoveryEmail: true,
      //     emailVerified: true,
      //   },
      // });

      throw new Error(
        'Deleting users is a manual process. Please contact support.'
      );
    },

    //? Sessions
    async createSession(session) {
      log('👀 createSession', { session });
      const sessionStorage = useStorage('sessions');
      const userObject = await db.query.users.findFirst({
        where: eq(users.id, +session.userId),
        columns: {
          id: true,
          publicId: true,
          username: true,
          recoveryEmail: true,
          emailVerified: true
        }
      });
      if (!userObject) {
        throw new Error('No user found.');
      }
      const sessionObject = {
        sessionToken: session.sessionToken,
        userId: userObject.id.toString(),
        userIdNumber: userObject.id,
        user: {
          id: userObject.id.toString(),
          idNumber: userObject.id,
          publicId: userObject.publicId,
          name: userObject.username,
          username: userObject.username,
          email: userObject.recoveryEmail,
          recoveryEmail: userObject.recoveryEmail,
          emailVerified: userObject.emailVerified
        } as AdapterUser,
        expires: session.expires
      } as AdapterSession;
      await sessionStorage.setItem(session.sessionToken, sessionObject, {
        ttl:
          Math.ceil((session.expires.getTime() - Date.now()) / 1000) ||
          60 * 60 * 24
      });

      return sessionObject;
    },
    async getSessionAndUser(sessionToken) {
      log('👀 getSessionAndUser', { sessionToken });
      const sessionStorage = useStorage('sessions');
      const sessionObject: AdapterSession | null =
        await sessionStorage.getItem(sessionToken);
      if (!sessionObject) {
        log('No session found from getSessionAndUser.', {
          data: sessionToken
        });
        return null;
      }

      sessionObject.expires = new Date(sessionObject.expires);
      return {
        session: sessionObject as AdapterSession,
        user: sessionObject.user
      };
    },
    async updateSession(session) {
      log('👀 updateSession', { session });
      const sessionStorage = useStorage('sessions');
      const sessionObject: AdapterSession | null = await sessionStorage.getItem(
        session.sessionToken
      );

      if (!sessionObject) {
        throw new Error('No session found.');
      }
      const updatedSessionObject: AdapterSession = {
        userId: sessionObject.userId,
        userIdNumber: sessionObject.userIdNumber,
        user: sessionObject.user,
        sessionToken: session.sessionToken || sessionObject.sessionToken,
        expires: session.expires || sessionObject.expires
      };

      await sessionStorage.setItem(session.sessionToken, updatedSessionObject, {
        ttl: session.expires
          ? Math.ceil((session.expires.getTime() - Date.now()) / 1000)
          : 60 * 60 * 24
      });
      return updatedSessionObject;
    },
    async deleteSession(sessionToken) {
      log('👀 deleteSession', { sessionToken });
      const sessionStorage = useStorage('sessions');
      const sessionObject: AdapterSession | null =
        await sessionStorage.getItem(sessionToken);
      if (!sessionObject) {
        return null;
      }

      await sessionStorage.removeItem(sessionToken);

      return sessionObject;
    },

    //? Accounts
    async linkAccount(account) {
      log('👀 linkAccount', { account });
      const userObject = await db.query.users.findFirst({
        where: eq(users.id, +account.userId),
        columns: {
          id: true
        }
      });
      if (!userObject) {
        throw new Error('No user found.');
      }
      const insertData = {
        userId: userObject?.id,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        expires_at: account.expires_at
      };
      await db.insert(accounts).values(insertData);
    },
    async unlinkAccount(account) {
      log('👀 unlinkAccount', { account });
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.providerAccountId, account.providerAccountId),
            eq(accounts.provider, account.provider)
          )
        );

      return undefined;
    },
    async listLinkedAccounts(userId) {
      log('👀 listLinkedAccounts', { userId });
      const accountsResult = await db.query.accounts.findMany({
        where: eq(accounts.userId, +userId),
        columns: {
          provider: true,
          providerAccountId: true,
          type: true,
          expires_at: true
        }
      });

      return accountsResult.map((account) => ({
        userId: userId.toString(),
        userIdNumber: +userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        type: account.type,
        expires_at: account.expires_at || undefined
      })) as AdapterAccount[];
    },

    //? Verification Tokens
    async createVerificationToken(token) {
      log('👀 createVerificationToken', { token });
      const sessionStorage = useStorage('sessions');
      await sessionStorage.setItem(`token:${token.identifier}`, token, {
        ttl:
          Math.ceil((token.expires.getTime() - Date.now()) / 1000) ||
          60 * 60 * 24
      });
      return token;
    },
    async useVerificationToken(token) {
      const sessionStorage = useStorage('sessions');
      const tokenData: VerificationToken | null = await sessionStorage.getItem(
        `token:${token.identifier}`
      );
      if (!tokenData) {
        throw new Error('No verification token found.');
      }
      await sessionStorage.removeItem(`token:${token.identifier}`);
      return tokenData;
    },

    //? Authenticators
    async createAuthenticator(authenticator) {
      log('👀 createAuthenticator', { authenticator });
      const b64ID = asBase64(authenticator.credentialID);
      const b64PK = asBase64(authenticator.credentialPublicKey);

      await db.insert(authenticators).values({
        providerAccountId: authenticator.providerAccountId,
        credentialID: b64ID,
        credentialPublicKey: b64PK,
        counter: +authenticator.counter,
        credentialDeviceType: authenticator.credentialDeviceType,
        credentialBackedUp: authenticator.credentialBackedUp,
        transports: authenticator.transports
      });

      return authenticator;
    },
    async updateAuthenticatorCounter(authenticator, newCounter) {
      log('👀 updateAuthenticatorCounter', {
        authenticator,
        newCounter
      });
      const b64ID = asBase64(authenticator.credentialID);

      const authenticatorObject = await db.query.authenticators.findFirst({
        where: eq(authenticators.credentialID, b64ID),
        columns: {
          counter: true
        }
      });
      if (!authenticatorObject) throw new Error('Authenticator not found');

      await db
        .update(authenticators)
        .set({
          counter: +newCounter
        })
        .where(eq(authenticators.credentialID, b64ID));

      const updatedAuthenticator = {
        ...authenticator,
        counter: +newCounter
      } as AdapterAuthenticator;
      return updatedAuthenticator;
    },
    async listAuthenticatorsByAccountId(accountId) {
      log('👀 listAuthenticatorsByAccountId', { accountId });
      const dbQuery = await db.query.authenticators.findMany({
        where: eq(authenticators.providerAccountId, accountId),
        columns: {
          providerAccountId: true,
          credentialID: true,
          credentialPublicKey: true,
          counter: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          transports: true
        }
      });
      const decodedResults: AdapterAuthenticator[] = dbQuery.map(
        (authenticator) => ({
          providerAccountId: authenticator.providerAccountId,
          credentialID: fromBase64(authenticator.credentialID),
          credentialPublicKey: fromBase64(authenticator.credentialPublicKey),
          counter: authenticator.counter,
          credentialDeviceType: authenticator.credentialDeviceType,
          credentialBackedUp: authenticator.credentialBackedUp,
          transports: authenticator.transports as
            | AuthenticatorTransport[]
            | undefined
        })
      );
      return decodedResults;
    },
    async getAuthenticator(credentialId) {
      log('👀 getAuthenticator', { credentialId });
      const b64ID = asBase64(credentialId);

      const dbQuery = await db.query.authenticators.findFirst({
        where: eq(authenticators.credentialID, b64ID),
        columns: {
          providerAccountId: true,
          credentialID: true,
          credentialPublicKey: true,
          counter: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          transports: true
        }
      });
      if (!dbQuery) return null;
      const decodedResult: AdapterAuthenticator = {
        providerAccountId: dbQuery.providerAccountId,
        credentialID: fromBase64(dbQuery.credentialID),
        credentialPublicKey: fromBase64(dbQuery.credentialPublicKey),
        counter: dbQuery.counter,
        credentialDeviceType: dbQuery.credentialDeviceType,
        credentialBackedUp: dbQuery.credentialBackedUp,
        transports: dbQuery.transports as AuthenticatorTransport[] | undefined
      };

      return decodedResult;
    },
    async deleteAuthenticator(credentialId) {
      log('👀 deleteAuthenticator', { credentialId });
      const b64ID = asBase64(credentialId);

      const dbDeleteResult = await db
        .delete(authenticators)
        .where(eq(authenticators.credentialID, b64ID));

      return dbDeleteResult.rowsAffected > 0;
    }
  };
}
export function asBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64');
}
export function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}
