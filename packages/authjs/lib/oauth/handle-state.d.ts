import type { OAuthConfigInternal } from "../../providers/oauth.js";
import type { InternalOptions, RequestInternal } from "../../types.js";
/**
 * When the authorization flow contains a state, we check if it's a redirect proxy
 * and if so, we return the random state and the original redirect URL.
 */
export declare function handleState(query: RequestInternal["query"], provider: OAuthConfigInternal<any>, isOnRedirectProxy: InternalOptions["isOnRedirectProxy"]): {
    randomState: string | undefined;
    proxyRedirect?: undefined;
} | {
    randomState: string | undefined;
    proxyRedirect: string | undefined;
};
//# sourceMappingURL=handle-state.d.ts.map