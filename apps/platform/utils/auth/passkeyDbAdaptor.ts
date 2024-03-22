import { eq } from 'drizzle-orm';
import { db } from '@u22n/database';
import { accountCredentials, authenticators } from '@u22n/database/schema';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

//! Enable debug logging
const debug = false;
const log = (...args: any[]) => {
  if (debug) {
    console.info('🔐 Passkey Auth DB Adapter', ...args);
  }
};

//* Utils

async function transformDbToAuthAuthenticator(
  dbQuery: typeof authenticators.$inferInsert
): Promise<Authenticator> {
  return {
    accountCredentialId: dbQuery.accountCredentialId,
    credentialID: isoBase64URL.toBuffer(dbQuery.credentialID),
    credentialPublicKey: isoBase64URL.toBuffer(dbQuery.credentialPublicKey),
    counter: Number(dbQuery.counter),
    credentialDeviceType: dbQuery.credentialDeviceType as CredentialDeviceType,
    credentialBackedUp: dbQuery.credentialBackedUp,
    transports: dbQuery.transports as AuthenticatorTransportFuture[] | undefined
  };
}

//* Passkey DB
export type CredentialDeviceType = 'singleDevice' | 'multiDevice';
export interface Authenticator {
  accountCredentialId: number;
  credentialID: Uint8Array;
  credentialPublicKey: Uint8Array;
  counter: number;
  credentialDeviceType: CredentialDeviceType;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
}

async function createAuthenticator(
  authenticator: Authenticator,
  nickname: string,
  // We use a default value for the db if not provided, so that we can also pass transactions
  passkeyDb = db
) {
  log('passkey: createAuthenticator', { authenticator });
  const b64ID = isoBase64URL.fromBuffer(authenticator.credentialID);
  const b64PK = isoBase64URL.fromBuffer(authenticator.credentialPublicKey);

  await passkeyDb.insert(authenticators).values({
    accountCredentialId: authenticator.accountCredentialId,
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
  const b64ID = isoBase64URL.fromBuffer(authenticator.credentialID);

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
      accountCredentialId: true,
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
  const b64ID = isoBase64URL.fromBuffer(credentialId);

  const dbDeleteResult = await db
    .delete(authenticators)
    .where(eq(authenticators.credentialID, b64ID));

  return dbDeleteResult.rowsAffected > 0;
}

async function listAuthenticatorsByaccountCredentialId(
  accountCredentialId: number
) {
  log('passkey: listAuthenticatorsByaccountCredentialId', {
    accountCredentialId
  });
  const dbQuery = await db.query.authenticators.findMany({
    where: eq(authenticators.accountCredentialId, accountCredentialId),
    columns: {
      id: true,
      accountCredentialId: true,
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
async function listAuthenticatorsByAccountId(accountId: number) {
  log('passkey: listAuthenticatorsByAccountId', { accountId });
  const dbQuery = await db.query.accountCredentials.findFirst({
    where: eq(accountCredentials.accountId, accountId),
    columns: {
      id: true
    },
    with: {
      authenticators: {
        columns: {
          id: true,
          accountCredentialId: true,
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
  createAuthenticator,
  updateAuthenticatorCounter,
  getAuthenticator,
  deleteAuthenticator,
  listAuthenticatorsByaccountCredentialId,
  listAuthenticatorsByAccountId
};
