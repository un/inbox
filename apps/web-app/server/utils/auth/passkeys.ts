import {
  generateRegistrationOptions as webAuthnGenerateRegistrationOptions,
  verifyRegistrationResponse as webAuthnVerifyRegistrationResponse,
  generateAuthenticationOptions as webAuthnGenerateAuthenticationOptions,
  verifyAuthenticationResponse as webAuthnVerifyAuthenticationResponse
} from '@simplewebauthn/server';
import { usePasskeysDb } from './passkeyDbAdaptor';

const runtimeConfig = useRuntimeConfig();

async function generateRegistrationOptions(
  userId: number,
  userPublicId: string,
  userName: string,
  userDisplayName: string
) {
  const userAuthenticators: Authenticator[] =
    await usePasskeysDb.listAuthenticatorsByUserId(userId);

  const registrationOptions = await webAuthnGenerateRegistrationOptions({
    rpName: runtimeConfig.auth.passkeys.rpName,
    rpID: runtimeConfig.auth.passkeys.rpID,
    userID: userPublicId,
    userName: userName,
    userDisplayName: userDisplayName,
    timeout: 60000,
    // Don't prompt users for additional information about the authenticator
    // (Recommended for smoother UX)
    attestationType: 'direct',
    excludeCredentials: userAuthenticators.map((authenticator) => ({
      id: authenticator.credentialID,
      type: 'public-key',
      transports: authenticator.transports
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'cross-platform'
    }
  });

  console.log('registrationOptions', { registrationOptions });

  const userChallenge = registrationOptions.challenge;
  //! store the challenge with userId into the redis db
  const authStorage = useStorage('auth');
  authStorage.setItem(`passkeyChallenge: ${userId}`, userChallenge);

  return registrationOptions;
}

async function verifyRegistrationResponse(
  registrationResponse: any,
  userId: number
) {
  const authStorage = useStorage('auth');
  const expectedChallenge = await authStorage.getItem(
    `passkeyChallenge: ${userId}`
  );
  if (!expectedChallenge) {
    throw new Error('No challenge found for user');
  }
  return await webAuthnVerifyRegistrationResponse({
    response: registrationResponse,
    expectedChallenge: expectedChallenge.toString(),
    expectedOrigin: runtimeConfig.auth.passkeys.origin,
    expectedRPID: runtimeConfig.auth.passkeys.rpID,
    expectedType: 'public-key',
    requireUserVerification: true,
    supportedAlgorithmIDs: [-7, -257]
  });
}

async function generateAuthenticationOptions(credentials: any) {
  return await webAuthnGenerateAuthenticationOptions({
    extensions: {
      appid: 'https://example.com',
      credProps: true,
      hmacCreateSecret: true
    },
    rpID: runtimeConfig.auth.passkeys.rpID,
    userVerification: 'preferred',
    timeout: 60000,
    allowCredentials: credentials,
    challenge: '1234567890'
  });
}

async function verifyAuthenticationResponse(
  authenticationResponse: any,
  expectedChallenge: string,
  expectedAllowedCredentials: any
) {
  return await webAuthnVerifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: expectedChallenge,
    expectedOrigin: runtimeConfig.auth.passkeys.origin,
    expectedRPID: runtimeConfig.auth.passkeys.rpID,
    expectedType: 'public-key',
    requireUserVerification: true,
    authenticator: {
      counter: 0,
      credentialID: 'credential-id',
      credentialPublicKey: 'credential-public-key',
      transports: ['usb', 'nfc', 'ble'],
      credType: 'public-key',
      fmt: 'packed'
    },
    expectedAllowedCredentials: expectedAllowedCredentials,
    supportedAlgorithmIDs: [-7, -257]
  });
}

export const usePasskeys = {
  generateRegistrationOptions: generateRegistrationOptions,
  verifyRegistrationResponse: verifyRegistrationResponse,
  generateAuthenticationOptions: generateAuthenticationOptions,
  verifyAuthenticationResponse: verifyAuthenticationResponse
};
