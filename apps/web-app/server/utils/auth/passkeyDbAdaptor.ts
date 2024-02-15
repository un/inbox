import { eq } from 'drizzle-orm';
import { Base64Encoding } from 'oslo/encoding';
import { db } from '@uninbox/database';
import { accounts, authenticators } from '@uninbox/database/schema';
import { AuthenticatorTransportFuture } from '@simplewebauthn/types';

//! Enable debug logging
const debug = true;
const log = (...args: any[]) => {
  if (debug) {
    console.log('🔐 Passkey Auth DB Adapter', ...args);
  }
};

//* Utils
const base64 = new Base64Encoding(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
);
async function transformDbToAuthAuthenticator(
  dbQuery: NonNullable<
    Awaited<ReturnType<typeof db.query.authenticators.findFirst>>
  >
): Promise<Authenticator> {
  return {
    accountId: dbQuery.accountId,
    credentialID: base64.decode(dbQuery.credentialID),
    credentialPublicKey: base64.decode(dbQuery.credentialPublicKey),
    counter: Number(dbQuery.counter),
    credentialDeviceType: dbQuery.credentialDeviceType as CredentialDeviceType,
    credentialBackedUp: dbQuery.credentialBackedUp,
    transports: dbQuery.transports as AuthenticatorTransportFuture[] | undefined
  };
}

//* Passkey DB
export type CredentialDeviceType = 'singleDevice' | 'multiDevice';
export interface Authenticator {
  accountId: number;
  credentialID: Uint8Array;
  credentialPublicKey: Uint8Array;
  counter: number;
  credentialDeviceType: CredentialDeviceType;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
}

async function createAuthenticator(
  authenticator: Authenticator,
  nickname: string
) {
  log('passkey: createAuthenticator', { authenticator });
  const b64ID = base64.encode(authenticator.credentialID);
  const b64PK = base64.encode(authenticator.credentialPublicKey);

  await db.insert(authenticators).values({
    accountId: authenticator.accountId,
    nickname: nickname,
    credentialID: b64ID,
    credentialPublicKey: b64PK,
    counter: BigInt(authenticator.counter),
    credentialDeviceType: authenticator.credentialDeviceType,
    credentialBackedUp: authenticator.credentialBackedUp,
    transports: authenticator.transports
  });

  return authenticator;
}

async function updateAuthenticatorCounter(
  authenticator: Pick<Authenticator, 'credentialID'>,
  newCounter: number
) {
  log('passkey: updateAuthenticatorCounter', {
    authenticator,
    newCounter
  });
  const b64ID = base64.encode(authenticator.credentialID);

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
      counter: BigInt(newCounter)
    })
    .where(eq(authenticators.credentialID, b64ID));

  const updatedAuthenticator = {
    ...authenticator,
    counter: +newCounter
  } as Authenticator;
  return updatedAuthenticator;
}

async function getAuthenticator(credentialId: string) {
  log('passkey: getAuthenticator', { credentialId });

  const dbQuery = await db.query.authenticators.findFirst({
    where: eq(authenticators.credentialID, credentialId),
    columns: {
      id: true,
      accountId: true,
      nickname: true,
      credentialID: true,
      credentialPublicKey: true,
      counter: true,
      credentialDeviceType: true,
      credentialBackedUp: true,
      transports: true,
      createdAt: true
    }
  });
  if (!dbQuery) return null;
  const decodedResult: Authenticator =
    await transformDbToAuthAuthenticator(dbQuery);

  return decodedResult;
}

async function deleteAuthenticator(credentialId: Uint8Array) {
  log('passkey: deleteAuthenticator', { credentialId });
  const b64ID = base64.encode(credentialId);

  const dbDeleteResult = await db
    .delete(authenticators)
    .where(eq(authenticators.credentialID, b64ID));

  return dbDeleteResult.rowsAffected > 0;
}

async function listAuthenticatorsByAccountId(accountId: number) {
  log('passkey: listAuthenticatorsByAccountId', { accountId });
  const dbQuery = await db.query.authenticators.findMany({
    where: eq(authenticators.accountId, accountId),
    columns: {
      id: true,
      accountId: true,
      nickname: true,
      credentialID: true,
      credentialPublicKey: true,
      counter: true,
      credentialDeviceType: true,
      credentialBackedUp: true,
      transports: true,
      createdAt: true
    }
  });
  const decodedResults: Authenticator[] = await Promise.all(
    dbQuery.map(
      async (authenticator) =>
        await transformDbToAuthAuthenticator(authenticator)
    )
  );
  return decodedResults;
}
async function listAuthenticatorsByUserId(userId: number) {
  log('passkey: listAuthenticatorsByAccountId', { userId });
  const dbQuery = await db.query.accounts.findFirst({
    where: eq(accounts.userId, userId),
    columns: {
      id: true
    },
    with: {
      authenticators: {
        columns: {
          id: true,
          accountId: true,
          nickname: true,
          credentialID: true,
          credentialPublicKey: true,
          counter: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          transports: true,
          createdAt: true
        }
      }
    }
  });
  if (!dbQuery || !dbQuery.authenticators) return [];
  const decodedResults: Authenticator[] = await Promise.all(
    dbQuery.authenticators.map(
      async (authenticator) =>
        await transformDbToAuthAuthenticator(authenticator)
    )
  );
  return decodedResults;
}

export const usePasskeysDb = {
  createAuthenticator: createAuthenticator,
  updateAuthenticatorCounter: updateAuthenticatorCounter,
  getAuthenticator: getAuthenticator,
  deleteAuthenticator: deleteAuthenticator,
  listAuthenticatorsByAccountId: listAuthenticatorsByAccountId,
  listAuthenticatorsByUserId: listAuthenticatorsByUserId
};
