import { PasskeyProviderType } from "src/providers/passkey.js"
import type { InternalOptions, ResponseInternal } from "../../types.js"
import { SessionStore, signCookie } from "../cookie.js"
import { session as routesSession } from "./session.js"
import {
  authenticationOptions,
  registrationOptions,
} from "../passkey/options.js"
import type {
  PasskeyOptionsCookieData,
  PasskeyOptionsReturn,
} from "../passkey/types.js"

/**
 * Generate passkey registration options and set the challenge cookie.
 */
async function doRegister(
  options: InternalOptions<PasskeyProviderType>,
  email: string
): Promise<ResponseInternal<PasskeyOptionsReturn>> {
  const { provider } = options

  // Get registration options
  const regOptions = await registrationOptions(options, email)

  // Set the cookie
  const cookieData: PasskeyOptionsCookieData = {
    providerAccountId: regOptions.user.id,
    challenge: regOptions.challenge,
  }
  const [cookie] = await signCookie({
    type: "challenge",
    value: cookieData,
    cookieOptions: { maxAge: provider.timeout },
    options,
  })

  // Return the options and set the challenge cookie
  return {
    status: 200,
    body: { options: regOptions, action: "register" },
    cookies: [cookie],
  }
}

/**
 * Generate passkey authentication options and set the challenge cookie.
 */
async function doAuthenticate(
  options: InternalOptions<PasskeyProviderType>,
  email?: string
): Promise<ResponseInternal<PasskeyOptionsReturn>> {
  // Get auth options
  const authOptions = await authenticationOptions(options, email)

  // Set the cookie
  const cookieData: PasskeyOptionsCookieData = {
    challenge: authOptions.challenge,
  }
  const [cookie] = await signCookie({
    type: "challenge",
    value: cookieData,
    cookieOptions: { maxAge: options.provider.timeout },
    options,
  })

  // Return the options and set the challenge cookie
  return {
    status: 200,
    body: { options: authOptions, action: "authenticate" },
    cookies: [cookie],
  }
}

/**
 * Handle passkey options requests by generating authentication or registration options
 * based on the query parameters and the user's credentials.
 *
 * @param request The incoming request.
 * @param options
 * @returns A response with the options and a signed challenge cookie.
 */
export async function passkeyOptions(
  options: InternalOptions<PasskeyProviderType>,
  sessionStore: SessionStore,
  action?: string,
  queryEmail?: string
): Promise<ResponseInternal<PasskeyOptionsReturn> | ResponseInternal<string>> {
  const { adapter } = options

  let selectedAction: string | undefined = action

  // Get the current session, if it exists
  // NOTE: this is a bit hacky, but routes.session seems to be
  // the only place that implements a full session/user check.
  const { body: currentSession } = await routesSession({
    options,
    sessionStore,
  })
  const sessionUserEmail = currentSession?.user?.email ?? undefined
  const loggedIn = !!sessionUserEmail

  const providedQueryEmail = !!queryEmail

  // Find whether a user with queryEmail exists
  let userWithEmailExists = false
  if (providedQueryEmail) {
    const existingUser = await adapter?.getUserByEmail(queryEmail)
    userWithEmailExists = !!existingUser
  }

  // This logic is explained in the original PR:
  // https://github.com/nextauthjs/next-auth/pull/8808
  switch (selectedAction) {
    case "authenticate": {
      return doAuthenticate(options, queryEmail)
    }
    case "register": {
      if (loggedIn !== providedQueryEmail && !userWithEmailExists) {
        return doRegister(options, sessionUserEmail ?? (queryEmail as string)) // TS isn't smart enough to know that this will be defined
      }

      break
    }
    case undefined: {
      if (!loggedIn) {
        if (providedQueryEmail === userWithEmailExists) {
          return doAuthenticate(options, queryEmail)
        } else {
          return doRegister(options, queryEmail as string) // TS isn't smart enough to know that this will be defined
        }
      }

      break
    }
  }

  return {
    status: 400,
    body: "Invalid action/email combination",
  }
}
