import {
  type Authenticator,
  getAuthenticator,
  listAuthenticatorsByAccountCredentialId,
  listAuthenticatorsByAccountId
} from './passkeyUtils';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import * as webAuthn from '@simplewebauthn/server';
import { storage } from '~platform/storage';
import { TRPCError } from '@trpc/server';
import { env } from '~platform/env';

type RegistrationOptions = {
  accountId?: number;
  accountPublicId: string;
  username: string;
  userDisplayName: string;
  authenticatorAttachment?: 'platform' | 'cross-platform';
};

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

  await storage.passkeyChallenges.setItem(accountPublicId, {
    type: 'registration',
    challenge: registrationOptions.challenge
  });

  return registrationOptions;
}

export async function verifyRegistrationResponse({
  registrationResponse,
  publicId
}: {
  registrationResponse: RegistrationResponseJSON;
  publicId: string;
}) {
  const expectedChallenge = await storage.passkeyChallenges.getItem(publicId);

  if (!expectedChallenge || expectedChallenge.type !== 'registration') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'No challenge found for account, It may have expired. Please try again.'
    });
  }

  const verifiedRegistrationResponse =
    await webAuthn.verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: expectedChallenge.challenge,
      expectedOrigin: env.WEBAPP_URL,
      expectedRPID: env.PRIMARY_DOMAIN
    });

  await storage.passkeyChallenges.removeItem(publicId);
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
  const credentials = accountId
    ? (await listAuthenticatorsByAccountCredentialId(accountId)).map(
        (passkey) => ({
          id: passkey.credentialID,
          type: 'public-key' as const,
          transports: passkey.transports
        })
      )
    : [];

  const authenticationOptions = await webAuthn.generateAuthenticationOptions({
    rpID: env.PRIMARY_DOMAIN,
    userVerification: 'preferred',
    timeout: 60000,
    allowCredentials: credentials
  });

  await storage.passkeyChallenges.setItem(authChallengeId, {
    type: 'authentication',
    challenge: authenticationOptions.challenge
  });

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

  const expectedChallenge =
    await storage.passkeyChallenges.getItem(authChallengeId);

  if (!expectedChallenge || expectedChallenge.type !== 'authentication') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Authentication challenge not found'
    });
  }

  const verificationResult = await webAuthn.verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: expectedChallenge.challenge,
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
