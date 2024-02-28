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
import { usePasskeysDb } from './passkeyDbAdaptor';
import { TRPCError } from '@trpc/server';
import { useRuntimeConfig, useStorage } from '#imports';

const runtimeConfig = useRuntimeConfig();

async function generateRegistrationOptions({
  userId,
  userPublicId,
  userName,
  userDisplayName,
  authenticatorAttachment = 'platform'
}: {
  userId: number;
  userPublicId: string;
  userName: string;
  userDisplayName: string;
  authenticatorAttachment?: 'platform' | 'cross-platform';
}) {
  const userAuthenticators: Authenticator[] =
    await usePasskeysDb.listAuthenticatorsByUserId(userId);

  const registrationOptions = await webAuthnGenerateRegistrationOptions({
    rpName: runtimeConfig.auth.passkeys.rpName,
    rpID: runtimeConfig.auth.passkeys.rpID,
    userID: userPublicId,
    userName: userName,
    userDisplayName: userDisplayName,
    timeout: 60000,

    // attestationType: 'direct', // recomended to be removed by passkeys.dev
    excludeCredentials: userAuthenticators.map((authenticator) => ({
      id: authenticator.credentialID,
      type: 'public-key',
      transports: authenticator.transports
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: authenticatorAttachment
    }
  });

  const userChallenge = registrationOptions.challenge;
  const authStorage = useStorage('auth');
  authStorage.setItem(`passkeyChallenge: ${userId}`, userChallenge);

  return registrationOptions;
}

async function verifyRegistrationResponse({
  registrationResponse,
  userId
}: {
  registrationResponse: RegistrationResponseJSON;
  userId: number;
}) {
  const authStorage = useStorage('auth');
  const expectedChallenge = await authStorage.getItem(
    `passkeyChallenge: ${userId}`
  );
  if (!expectedChallenge) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No challenge found for user'
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
  if (!verifiedRegistrationResponse.verified) {
    await authStorage.removeItem(`passkeyChallenge: ${userId}`);
    throw new Error('Registration verification failed');
  }
  await authStorage.removeItem(`passkeyChallenge: ${userId}`);
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
  authChallengeId
}: {
  authenticationResponse: AuthenticationResponseJSON;
  authChallengeId: string;
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
  generateRegistrationOptions: generateRegistrationOptions,
  verifyRegistrationResponse: verifyRegistrationResponse,
  generateAuthenticationOptions: generateAuthenticationOptions,
  verifyAuthenticationResponse: verifyAuthenticationResponse
};
