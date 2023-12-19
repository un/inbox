import type { CookiesOptions, InternalOptions, RequestInternal } from "../../types.js";
import type { Cookie } from "../cookie.js";
/** Returns a signed cookie. */
export declare function signCookie(type: keyof CookiesOptions, value: string, maxAge: number, options: InternalOptions<"oauth" | "oidc">, data?: any): Promise<Cookie>;
export declare const pkce: {
    create(options: InternalOptions<"oauth">): Promise<{
        cookie: Cookie;
        value: string;
    }>;
    /**
     * Returns code_verifier if the provider is configured to use PKCE,
     * and clears the container cookie afterwards.
     * An error is thrown if the code_verifier is missing or invalid.
     * @see https://www.rfc-editor.org/rfc/rfc7636
     * @see https://danielfett.de/2020/05/16/pkce-vs-nonce-equivalent-or-not/#pkce
     */
    use(cookies: RequestInternal["cookies"], resCookies: Cookie[], options: InternalOptions<"oauth">): Promise<string | undefined>;
};
export declare function decodeState(value: string): {
    /** If defined, a redirect proxy is being used to support multiple OAuth apps with a single callback URL */
    origin?: string;
    /** Random value for CSRF protection */
    random: string;
} | undefined;
export declare const state: {
    create(options: InternalOptions<"oauth">, data?: object): Promise<{
        cookie: Cookie;
        value: string;
    } | undefined>;
    /**
     * Returns state if the provider is configured to use state,
     * and clears the container cookie afterwards.
     * An error is thrown if the state is missing or invalid.
     * @see https://www.rfc-editor.org/rfc/rfc6749#section-10.12
     * @see https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1
     */
    use(cookies: RequestInternal["cookies"], resCookies: Cookie[], options: InternalOptions<"oauth">, paramRandom?: string): Promise<string | undefined>;
};
export declare const nonce: {
    create(options: InternalOptions<"oidc">): Promise<{
        cookie: Cookie;
        value: string;
    } | undefined>;
    /**
     * Returns nonce if the provider is configured to use nonce,
     * and clears the container cookie afterwards.
     * An error is thrown if the nonce is missing or invalid.
     * @see https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes
     * @see https://danielfett.de/2020/05/16/pkce-vs-nonce-equivalent-or-not/#nonce
     */
    use(cookies: RequestInternal["cookies"], resCookies: Cookie[], options: InternalOptions<"oidc">): Promise<string | undefined>;
};
//# sourceMappingURL=checks.d.ts.map