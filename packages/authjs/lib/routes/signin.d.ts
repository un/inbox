import type { InternalOptions, RequestInternal, ResponseInternal } from "../../types.js";
/**
 * Initiates the sign in process for OAuth and Email flows .
 * For OAuth, redirects to the provider's authorization URL.
 * For Email, sends an email with a sign in link.
 */
export declare function signin(request: RequestInternal, options: InternalOptions<"oauth" | "oidc" | "email">): Promise<ResponseInternal>;
//# sourceMappingURL=signin.d.ts.map