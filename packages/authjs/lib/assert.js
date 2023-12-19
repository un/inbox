import { defaultCookies } from "./cookie.js";
import { InvalidCallbackUrl, InvalidEndpoints, MissingAdapter, MissingAdapterMethods, MissingAuthorize, MissingSecret, UnsupportedStrategy, UntrustedHost, MultiplePasskeyAccountsError, } from "../errors.js";
let warned = false;
function isValidHttpUrl(url, baseUrl) {
    try {
        return /^https?:/.test(new URL(url, url.startsWith("/") ? baseUrl : undefined).protocol);
    }
    catch {
        return false;
    }
}
let hasCredentials = false;
let hasEmail = false;
let hasPasskey = false;
const emailMethods = [
    "createVerificationToken",
    "useVerificationToken",
    "getUserByEmail",
];
const sessionMethods = [
    "createUser",
    "getUser",
    "getUserByEmail",
    "getUserByAccount",
    "updateUser",
    "linkAccount",
    "createSession",
    "getSessionAndUser",
    "updateSession",
    "deleteSession",
];
const passkeyMethods = [
    "createAuthenticator",
    "createUser",
    "getAuthenticator",
    "getUserByAccount",
    "getUserByEmail",
    "linkAccount",
    "listAuthenticatorsByAccountId",
    "listLinkedAccounts",
    "updateAuthenticatorCounter",
];
/**
 * Verify that the user configured Auth.js correctly.
 * Good place to mention deprecations as well.
 *
 * This is invoked before the init method, so default values are not available yet.
 */
export function assertConfig(request, options) {
    const { url } = request;
    const warnings = [];
    if (!warned && options.debug)
        warnings.push("debug-enabled");
    if (!options.trustHost) {
        return new UntrustedHost(`Host must be trusted. URL was: ${request.url}`);
    }
    if (!options.secret) {
        return new MissingSecret("Please define a `secret`.");
    }
    const callbackUrlParam = request.query?.callbackUrl;
    if (callbackUrlParam && !isValidHttpUrl(callbackUrlParam, url.origin)) {
        return new InvalidCallbackUrl(`Invalid callback URL. Received: ${callbackUrlParam}`);
    }
    const { callbackUrl: defaultCallbackUrl } = defaultCookies(options.useSecureCookies ?? url.protocol === "https:");
    const callbackUrlCookie = request.cookies?.[options.cookies?.callbackUrl?.name ?? defaultCallbackUrl.name];
    if (callbackUrlCookie && !isValidHttpUrl(callbackUrlCookie, url.origin)) {
        return new InvalidCallbackUrl(`Invalid callback URL. Received: ${callbackUrlCookie}`);
    }
    for (const p of options.providers) {
        const provider = typeof p === "function" ? p() : p;
        if ((provider.type === "oauth" || provider.type === "oidc") &&
            !(provider.issuer ?? provider.options?.issuer)) {
            const { authorization: a, token: t, userinfo: u } = provider;
            let key;
            if (typeof a !== "string" && !a?.url)
                key = "authorization";
            else if (typeof t !== "string" && !t?.url)
                key = "token";
            else if (typeof u !== "string" && !u?.url)
                key = "userinfo";
            if (key) {
                return new InvalidEndpoints(`Provider "${provider.id}" is missing both \`issuer\` and \`${key}\` endpoint config. At least one of them is required.`);
            }
        }
        if (provider.type === "credentials")
            hasCredentials = true;
        else if (provider.type === "email")
            hasEmail = true;
        else if (provider.type === "passkey") {
            let passkeyCount = options.providers.filter((p) => (typeof p === "function" ? p() : p).type === "passkey").length;
            if (passkeyCount > 1) {
                return new MultiplePasskeyAccountsError("Multiple passkey accounts are not supported.");
            }
            else {
                hasPasskey = true;
            }
        }
    }
    if (hasCredentials) {
        const dbStrategy = options.session?.strategy === "database";
        const onlyCredentials = !options.providers.some((p) => (typeof p === "function" ? p() : p).type !== "credentials");
        if (dbStrategy && onlyCredentials) {
            return new UnsupportedStrategy("Signin in with credentials only supported if JWT strategy is enabled");
        }
        const credentialsNoAuthorize = options.providers.some((p) => {
            const provider = typeof p === "function" ? p() : p;
            return provider.type === "credentials" && !provider.authorize;
        });
        if (credentialsNoAuthorize) {
            return new MissingAuthorize("Must define an authorize() handler to use credentials authentication provider");
        }
    }
    const { adapter, session } = options;
    if (hasEmail ||
        hasPasskey ||
        session?.strategy === "database" ||
        (!session?.strategy && adapter)) {
        let methods;
        if (hasEmail) {
            if (!adapter)
                return new MissingAdapter("Email login requires an adapter.");
            methods = emailMethods;
        }
        else {
            if (!adapter)
                return new MissingAdapter("Database session requires an adapter.");
            methods = sessionMethods;
        }
        if (hasPasskey) {
            methods = [...new Set([...methods, ...passkeyMethods])];
        }
        const missing = methods.filter((m) => !adapter[m]);
        if (missing.length) {
            return new MissingAdapterMethods(`Required adapter methods were missing: ${missing.join(", ")}`);
        }
    }
    if (!warned)
        warned = true;
    return warnings;
}
