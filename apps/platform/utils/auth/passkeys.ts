import {
  generateRegistrationOptions as webAuthnGenerateRegistrationOptions,
  verifyRegistrationResponse as webAuthnVerifyRegistrationResponse,
  generateAuthenticationOptions as webAuthnGenerateAuthenticationOptions,
  verifyAuthenticationResponse as webAuthnVerifyAuthenticationResponse
} from '@simplewebauthn/server';
import {
  RegistrationResponseJSON,
  PublicKeyCredentialDescriptorFuture,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import { Authenticator, usePasskeysDb } from './passkeyDbAdaptor';
import { TRPCError } from '@trpc/server';
import { useRuntimeConfig, useStorage } from '#imports';

const runtimeConfig = useRuntimeConfig();

type RegistrationOptions = {
  userId?: number;
  userPublicId: string;
  userName: string;
  userDisplayName: string;
  authenticatorAttachment?: 'platform' | 'cross-platform';
};

async function generateRegistrationOptions(options: RegistrationOptions) {
  const {
    userPublicId,
    userName,
    userDisplayName,
    authenticatorAttachment,
    userId
  } = options;

  // We assume that the user is new if userId is undefined, and we don't have any authenticators for them
  const userAuthenticators: Authenticator[] =
    typeof userId !== 'undefined'
      ? []
      : await usePasskeysDb.listAuthenticatorsByUserId(userId);

  const registrationOptions = await webAuthnGenerateRegistrationOptions({
    rpName: runtimeConfig.auth.passkeys.rpName,
    rpID: runtimeConfig.auth.passkeys.rpID,
    userID: userPublicId,
    userName,
    userDisplayName,
    timeout: 60000,
    // As suggested by https://simplewebauthn.dev/docs/packages/server#1-generate-registration-options
    attestationType: 'none',
    excludeCredentials: userAuthenticators.map((authenticator) => ({
      id: authenticator.credentialID,
      type: 'public-key',
      transports: authenticator.transports
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment
    }
  });

  const authStorage = useStorage('auth');
  authStorage.setItem(
    `passkeyChallenge: ${userPublicId}`,
    registrationOptions.challenge
  );

  return registrationOptions;
}

async function verifyRegistrationResponse({
  registrationResponse,
  publicId
}: {
  registrationResponse: RegistrationResponseJSON;
  publicId: string;
}) {
  const authStorage = useStorage('auth');
  const expectedChallenge = await authStorage.getItem(
    `passkeyChallenge: ${publicId}`
  );

  if (!expectedChallenge) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'No challenge found for user, It may have expired. Please try again.'
    });
  }

  const verifiedRegistrationResponse = await webAuthnVerifyRegistrationResponse(
    {
      response: registrationResponse,
      expectedChallenge: expectedChallenge.toString(),
      expectedOrigin: runtimeConfig.auth.passkeys.origin,
      expectedRPID: runtimeConfig.auth.passkeys.rpID
    }
  );
  await authStorage.removeItem(`passkeyChallenge: ${publicId}`);
  if (!verifiedRegistrationResponse.verified) {
    throw new Error('Registration verification failed');
  }
  return verifiedRegistrationResponse;
}

async function generateAuthenticationOptions({
  authChallengeId,
  credentials = []
}: {
  authChallengeId: string;
  credentials?: PublicKeyCredentialDescriptorFuture[];
}) {
  const authenticationOptions = await webAuthnGenerateAuthenticationOptions({
    rpID: runtimeConfig.auth.passkeys.rpID,
    userVerification: 'preferred',
    timeout: 60000,
    allowCredentials: credentials
  });

  const userChallenge = authenticationOptions.challenge;
  const authStorage = useStorage('auth');
  await authStorage.setItem(`authChallenge: ${authChallengeId}`, userChallenge);

  return authenticationOptions;
}

async function verifyAuthenticationResponse({
  authenticationResponse,
  expectedAllowedCredentials,
  authChallengeId
}: {
  authenticationResponse: AuthenticationResponseJSON;
  authChallengeId: string;
  expectedAllowedCredentials?: any;
}) {
  const authenticator = await usePasskeysDb.getAuthenticator(
    authenticationResponse.id
  );

  if (!authenticator) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Authenticator not found'
    });
  }
  const authStorage = useStorage('auth');
  const expectedChallenge = await authStorage.getItem(
    `authChallenge: ${authChallengeId}`
  );

  const verificationResult = await webAuthnVerifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: expectedChallenge as string,
    expectedOrigin: runtimeConfig.auth.passkeys.origin,
    expectedRPID: runtimeConfig.auth.passkeys.rpID,
    requireUserVerification: true,
    authenticator: authenticator
  });
  return { result: verificationResult, userAccount: authenticator.accountId };
}

export const usePasskeys = {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
};
