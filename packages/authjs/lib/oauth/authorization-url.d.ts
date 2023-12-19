import type { InternalOptions, RequestInternal, ResponseInternal } from "../../types.js";
/**
 * Generates an authorization/request token URL.
 *
 * [OAuth 2](https://www.oauth.com/oauth2-servers/authorization/the-authorization-request/)
 */
export declare function getAuthorizationUrl(query: RequestInternal["query"], options: InternalOptions<"oauth" | "oidc">): Promise<ResponseInternal>;
//# sourceMappingURL=authorization-url.d.ts.map