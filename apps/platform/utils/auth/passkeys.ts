import * as webAuthn from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  PublicKeyCredentialDescriptorFuture,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import {
  type Authenticator,
  getAuthenticator,
  listAuthenticatorsByAccountCredentialId,
  listAuthenticatorsByAccountId
} from './passkeyUtils';
import { TRPCError } from '@trpc/server';
import { env } from '~platform/env';
import { storage } from '~platform/storage';

type RegistrationOptions = {
  accountId?: number;
  accountPublicId: string;
  username: string;
  userDisplayName: string;
  authenticatorAttachment?: 'platform' | 'cross-platform';
};

const authStorage = storage.auth;

export async function generateRegistrationOptions(
  options: RegistrationOptions
) {
  const { accountPublicId, username, userDisplayName, accountId } = options;

  // We assume that the account is new if accountId is undefined, and we don't have any authenticators for them
  const accountAuthenticators: Authenticator[] =
    typeof accountId === 'undefined'
      ? []
      : await listAuthenticatorsByAccountId(accountId);

  const registrationOptions = await webAuthn.generateRegistrationOptions({
    rpName: env.APP_NAME,
    rpID: env.PRIMARY_DOMAIN,
    userID: accountPublicId,
    userName: username,
    userDisplayName,
    timeout: 60000,
    // As suggested by https://simplewebauthn.dev/docs/packages/server#1-generate-registration-options
    attestationType: 'none',
    excludeCredentials: accountAuthenticators.map((authenticator) => ({
      id: authenticator.credentialID,
      type: 'public-key',
      transports: authenticator.transports
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred'
    }
  });

  authStorage.setItem(
    `passkeyChallenge: ${accountPublicId}`,
    registrationOptions.challenge
  );

  return registrationOptions;
}

export async function verifyRegistrationResponse({
  registrationResponse,
  publicId
}: {
  registrationResponse: RegistrationResponseJSON;
  publicId: string;
}) {
  const expectedChallenge = await authStorage.getItem(
    `passkeyChallenge: ${publicId}`
  );

  if (!expectedChallenge) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'No challenge found for account, It may have expired. Please try again.'
    });
  }

  const verifiedRegistrationResponse =
    await webAuthn.verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: expectedChallenge.toString(),
      expectedOrigin: env.WEBAPP_URL,
      expectedRPID: env.PRIMARY_DOMAIN
    });
  await authStorage.removeItem(`passkeyChallenge: ${publicId}`);
  if (!verifiedRegistrationResponse.verified) {
    throw new Error('Registration verification failed');
  }
  return verifiedRegistrationResponse;
}

export async function generateAuthenticationOptions({
  authChallengeId,
  accountId
}: {
  authChallengeId: string;
  accountId?: number;
}) {
  const credentials: PublicKeyCredentialDescriptorFuture[] = [];

  if (accountId) {
    const accountPasskeys =
      await listAuthenticatorsByAccountCredentialId(accountId);

    for (const passkey of accountPasskeys) {
      credentials.push({
        id: passkey.credentialID,
        type: 'public-key',
        transports: passkey.transports
      });
    }
  }

  const authenticationOptions = await webAuthn.generateAuthenticationOptions({
    rpID: env.PRIMARY_DOMAIN,
    userVerification: 'preferred',
    timeout: 60000,
    allowCredentials: credentials
  });

  const userChallenge = authenticationOptions.challenge;
  await authStorage.setItem(`authChallenge: ${authChallengeId}`, userChallenge);

  return authenticationOptions;
}

export async function verifyAuthenticationResponse({
  authenticationResponse,
  authChallengeId
}: {
  authenticationResponse: AuthenticationResponseJSON;
  authChallengeId: string;
}) {
  const authenticator = await getAuthenticator(authenticationResponse.id);

  if (!authenticator) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Authenticator not found'
    });
  }

  const expectedChallenge = await authStorage.getItem(
    `authChallenge: ${authChallengeId}`
  );

  const verificationResult = await webAuthn.verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: expectedChallenge as string,
    expectedOrigin: env.WEBAPP_URL,
    expectedRPID: env.PRIMARY_DOMAIN,
    requireUserVerification: true,
    authenticator: authenticator
  });
  return {
    result: verificationResult,
    accountId: authenticator.accountId
  };
}
