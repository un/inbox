import { InvalidCheck } from "../../errors.js";
import { decodeState } from "./checks.js";
/**
 * When the authorization flow contains a state, we check if it's a redirect proxy
 * and if so, we return the random state and the original redirect URL.
 */
export function handleState(query, provider, isOnRedirectProxy) {
    let randomState;
    let proxyRedirect;
    if (provider.redirectProxyUrl && !query?.state) {
        throw new InvalidCheck("Missing state in query, but required for redirect proxy");
    }
    const state = decodeState(query?.state);
    randomState = state?.random;
    if (isOnRedirectProxy) {
        if (!state?.origin)
            return { randomState };
        proxyRedirect = `${state.origin}?${new URLSearchParams(query)}`;
    }
    return { randomState, proxyRedirect };
}
