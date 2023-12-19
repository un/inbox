import * as cookie from "./cookie.js";
import type { AuthConfig, InternalOptions, RequestInternal } from "../types.js";
interface InitParams {
    url: URL;
    authOptions: AuthConfig;
    providerId?: string;
    action: InternalOptions["action"];
    /** Callback URL value extracted from the incoming request. */
    callbackUrl?: string;
    /** CSRF token value extracted from the incoming request. From body if POST, from query if GET */
    csrfToken?: string;
    /** Is the incoming request a POST request? */
    csrfDisabled: boolean;
    isPost: boolean;
    cookies: RequestInternal["cookies"];
}
/** Initialize all internal options and cookies. */
export declare function init({ authOptions, providerId, action, url: reqUrl, cookies: reqCookies, callbackUrl: reqCallbackUrl, csrfToken: reqCsrfToken, csrfDisabled, isPost, }: InitParams): Promise<{
    options: InternalOptions;
    cookies: cookie.Cookie[];
}>;
export {};
//# sourceMappingURL=init.d.ts.map