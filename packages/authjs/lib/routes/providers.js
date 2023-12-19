/**
 * Return a JSON object with a list of all OAuth providers currently configured
 * and their signin and callback URLs. This makes it possible to automatically
 * generate buttons for all providers when rendering client side.
 */
export function providers(providers) {
    return {
        headers: { "Content-Type": "application/json" },
        body: providers.reduce((acc, { id, name, type, signinUrl, callbackUrl }) => {
            acc[id] = { id, name, type, signinUrl, callbackUrl };
            return acc;
        }, {}),
    };
}
