import type { Account, InternalOptions, RequestInternal } from "../../types.js"
import {
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server"
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server/script/deps"
import {
  type Adapter,
  type AdapterAuthenticator,
  type AdapterUser,
} from "../../adapters.js"
import type { PasskeyOptionsCookieData } from "./types.js"
import {
  AdapterError,
  MissingAdapter,
  WebAuthnVerificationError,
} from "../../errors.js"
import { decodeSignedCookie } from "../cookie.js"
import type { PasskeyProviderType } from "../../providers/passkey.js"

export type UserData = {
  user: AdapterUser
  account: Account
  authenticator?: AdapterAuthenticator
}

/**
 * Verify a passkey registration response.
 * It checks the challenge cookie, verifies the response, and updates the user's authenticators.
 *
 * @param options
 * @param reqCookies request cookies
 * @param response response object from the client's `startAuthentication`
 * @returns Whether the authentication was successful.
 */
export async function verifyAuthentication(
  options: InternalOptions<PasskeyProviderType>,
  reqCookies: RequestInternal["cookies"],
  response: unknown
): Promise<UserData | string> {
  const { adapter, provider, logger } = options

  // Validate that the adapter is defined and implements the required methods
  if (!adapter)
    throw new MissingAdapter("Passkey provider requires an adapter.")

  // Basic response type check
  if (
    typeof response !== "object" ||
    response === null ||
    !("id" in response) ||
    typeof response.id !== "string"
  ) {
    return "Invalid response."
  }

  // Get cookie with challenge
  const [cookie] = await decodeSignedCookie<PasskeyOptionsCookieData>(
    "challenge",
    reqCookies,
    options
  )
  if (!cookie) {
    return "Missing challenge cookie."
  }
  const { challenge: expectedChallenge } = cookie

  // Get the authenticator from the database
  const uintID = new Uint8Array(Buffer.from(response.id, "base64"))
  const authenticator = (await adapter.getAuthenticator(uintID)) ?? null
  if (!authenticator) {
    logger.debug(`Authenticator not found.`, { id: response.id })
    return `Authenticator not found.`
  }

  // Do the actual verification
  let verification: VerifiedAuthenticationResponse
  try {
    verification = await verifyAuthenticationResponse({
      response: response as AuthenticationResponseJSON,
      authenticator,
      expectedChallenge,
      expectedOrigin: provider.relayingParty.origin,
      expectedRPID: provider.relayingParty.id,
      requireUserVerification: true,
    })
  } catch (e: any) {
    const err = new WebAuthnVerificationError(e)
    logger.error(err)

    return err.message
  }

  const { verified, authenticationInfo } = verification

  // make sure the response is verified
  if (!verified) {
    return "Failed to verify response."
  }

  // Update the authenticator counter
  try {
    const { newCounter } = authenticationInfo
    await adapter.updateAuthenticatorCounter(authenticator, newCounter)
  } catch (e: any) {
    // Log detailed error message
    logger.error(
      new AdapterError(
        `Failed to update authenticator counter. This may cause future authentication attempts to fail. ${JSON.stringify(
          {
            authenticatorID: response.id,
            oldCounter: authenticator.counter,
            newCounter: authenticationInfo.newCounter,
          }
        )}`,
        e
      )
    )
    // Throw base error to avoid leaking values
    throw new AdapterError(e)
  }

  const user = await adapter.getUserByAccount({
    provider: provider.id,
    providerAccountId: authenticator.providerAccountId,
  })

  if (!user) {
    logger.debug(
      `User not found for account ${authenticator.providerAccountId}. This should not happen.`,
      {
        provider: provider.id,
        providerAccountId: authenticator.providerAccountId,
      }
    )

    throw new WebAuthnVerificationError(
      "User not found. See debug logs for more details."
    )
  }

  const account: Account = {
    userId: user.id,
    type: provider.type,
    provider: provider.id,
    providerAccountId: authenticator.providerAccountId,
  }

  return {
    account,
    user,
  }
}

/**
 * Verify a passkey registration response.
 *
 * @param options
 * @param reqCookies request cookies
 * @param response response object from the client's `startRegistration`
 * @param email user's email
 * @returns
 */
export async function verifyRegistration(
  options: InternalOptions<PasskeyProviderType>,
  reqCookies: RequestInternal["cookies"],
  response: unknown,
  email: unknown
): Promise<Required<UserData | string>> {
  const { provider, logger } = options

  // An email must be provided
  if (typeof email !== "string") {
    return "Email is required for registration."
  }

  // Basic response type check
  if (
    typeof response !== "object" ||
    response === null ||
    !("id" in response) ||
    typeof response.id !== "string"
  ) {
    return "Invalid response."
  }

  // Get cookie with challenge and user ID
  const [cookie] = await decodeSignedCookie<PasskeyOptionsCookieData>(
    "challenge",
    reqCookies,
    options
  )
  if (!cookie) {
    return "Missing challenge cookie."
  }

  // Get the challenge and providerAccountId, and make sure the user ID exists
  const { challenge: expectedChallenge, providerAccountId } = cookie
  if (!providerAccountId) {
    return "Missing providerAccountId from challenge cookie."
  }

  // Do the actual verification
  let verification: VerifiedRegistrationResponse
  try {
    verification = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: provider.relayingParty.origin,
      expectedRPID: provider.relayingParty.id,
      requireUserVerification: true,
    })
  } catch (e: any) {
    const err = new WebAuthnVerificationError(e)
    logger.error(err)

    return err.message
  }

  // If not verified, return false
  const { verified, registrationInfo } = verification
  if (!verified || !registrationInfo) {
    return "Failed to verify response."
  }

  const user: AdapterUser = {
    id: email,
    email,
    emailVerified: null,
  }

  const account: Account = {
    userId: user.id,
    type: provider.type,
    provider: provider.id,
    providerAccountId,
  }

  const authenticator: AdapterAuthenticator = {
    providerAccountId,
    counter: registrationInfo.counter,
    credentialID: registrationInfo.credentialID,
    credentialBackedUp: registrationInfo.credentialBackedUp,
    credentialDeviceType: registrationInfo.credentialDeviceType,
    credentialPublicKey: registrationInfo.credentialPublicKey,
    transports: (response as RegistrationResponseJSON).response.transports as
      | AuthenticatorTransport[]
      | undefined,
  }

  return { authenticator, account, user }
}
