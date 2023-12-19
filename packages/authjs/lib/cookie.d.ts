import type { CookieSerializeOptions } from "cookie";
import type { CookieOption, CookiesOptions, InternalOptions, LoggerInstance, RequestInternal } from "../types.js";
/** Stringified form of `JWT`. Extract the content with `jwt.decode` */
export type JWTString = string;
export type SetCookieOptions = Partial<CookieOption["options"]> & {
    expires?: Date | string;
    encode?: (val: unknown) => string;
};
/**
 * If `options.session.strategy` is set to `jwt`, this is a stringified `JWT`.
 * In case of `strategy: "database"`, this is the `sessionToken` of the session in the database.
 */
export type SessionToken<T extends "jwt" | "database" = "jwt"> = T extends "jwt" ? JWTString : string;
/**
 * Use secure cookies if the site uses HTTPS
 * This being conditional allows cookies to work non-HTTPS development URLs
 * Honour secure cookie option, which sets 'secure' and also adds '__Secure-'
 * prefix, but enable them by default if the site URL is HTTPS; but not for
 * non-HTTPS URLs like http://localhost which are used in development).
 * For more on prefixes see https://googlechrome.github.io/samples/cookie-prefixes/
 *
 * @TODO Review cookie settings (names, options)
 */
export declare function defaultCookies(useSecureCookies: boolean): CookiesOptions;
export interface Cookie extends CookieOption {
    value: string;
}
export declare class SessionStore {
    #private;
    constructor(option: CookieOption, req: Partial<{
        cookies: any;
        headers: any;
    }>, logger: LoggerInstance | Console);
    /**
     * The JWT Session or database Session ID
     * constructed from the cookie chunks.
     */
    get value(): string;
    /**
     * Given a cookie value, return new cookies, chunked, to fit the allowed cookie size.
     * If the cookie has changed from chunked to unchunked or vice versa,
     * it deletes the old cookies as well.
     */
    chunk(value: string, options: Partial<Cookie["options"]>): Cookie[];
    /** Returns a list of cookies that should be cleaned. */
    clean(): Cookie[];
}
export declare function encodePayload(payload: unknown): string;
/** Returns a signed cookie. */
export declare function signCookie<T extends unknown>({ options, type, value, data, cookieOptions, }: {
    type: keyof CookiesOptions;
    value: T;
    options: InternalOptions;
    data?: unknown;
    cookieOptions?: CookieSerializeOptions;
}): Promise<[Cookie, string]>;
export declare function decodePayload<T extends unknown>(encoded: string): T;
/** Returns a signed cookie's data */
export declare function decodeSignedCookie<T extends unknown>(type: keyof CookiesOptions, cookies: RequestInternal["cookies"], options: InternalOptions): Promise<[T, string] | [null, null]>;
//# sourceMappingURL=cookie.d.ts.map