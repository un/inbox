import type { Account, InternalOptions, RequestInternal } from "../../types.js";
import { type AdapterAuthenticator, type AdapterUser } from "../../adapters.js";
import type { PasskeyProviderType } from "../../providers/passkey.js";
export type UserData = {
    user: AdapterUser;
    account: Account;
    authenticator?: AdapterAuthenticator;
};
/**
 * Verify a passkey registration response.
 * It checks the challenge cookie, verifies the response, and updates the user's authenticators.
 *
 * @param options
 * @param reqCookies request cookies
 * @param response response object from the client's `startAuthentication`
 * @returns Whether the authentication was successful.
 */
export declare function verifyAuthentication(options: InternalOptions<PasskeyProviderType>, reqCookies: RequestInternal["cookies"], response: unknown): Promise<UserData | string>;
/**
 * Verify a passkey registration response.
 *
 * @param options
 * @param reqCookies request cookies
 * @param response response object from the client's `startRegistration`
 * @param email user's email
 * @returns
 */
export declare function verifyRegistration(options: InternalOptions<PasskeyProviderType>, reqCookies: RequestInternal["cookies"], response: unknown, email: unknown): Promise<Required<UserData | string>>;
//# sourceMappingURL=verify.d.ts.map