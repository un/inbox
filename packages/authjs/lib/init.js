import * as jwt from "../jwt.js";
import { createCallbackUrl } from "./callback-url.js";
import * as cookie from "./cookie.js";
import { createCSRFToken } from "./csrf-token.js";
import { defaultCallbacks } from "./default-callbacks.js";
import { AdapterError, EventError } from "../errors.js";
import parseProviders from "./providers.js";
import { logger } from "./utils/logger.js";
import parseUrl from "./utils/parse-url.js";
/** Initialize all internal options and cookies. */
export async function init({ authOptions, providerId, action, url: reqUrl, cookies: reqCookies, callbackUrl: reqCallbackUrl, csrfToken: reqCsrfToken, csrfDisabled, isPost, }) {
    // TODO: move this to web.ts
    const parsed = parseUrl(reqUrl.origin +
        reqUrl.pathname.replace(`/${action}`, "").replace(`/${providerId}`, ""));
    const url = new URL(parsed.toString());
    const { providers, provider } = parseProviders({
        providers: authOptions.providers,
        url,
        providerId,
        options: authOptions,
    });
    const maxAge = 30 * 24 * 60 * 60; // Sessions expire after 30 days of being idle by default
    let isOnRedirectProxy = false;
    if ((provider?.type === "oauth" || provider?.type === "oidc") &&
        provider.redirectProxyUrl) {
        try {
            isOnRedirectProxy =
                new URL(provider.redirectProxyUrl).origin === url.origin;
        }
        catch {
            throw new TypeError(`redirectProxyUrl must be a valid URL. Received: ${provider.redirectProxyUrl}`);
        }
    }
    // User provided options are overridden by other options,
    // except for the options with special handling above
    const options = {
        debug: false,
        pages: {},
        theme: {
            colorScheme: "auto",
            logo: "",
            brandColor: "",
            buttonText: "",
        },
        // Custom options override defaults
        ...authOptions,
        // These computed settings can have values in userOptions but we override them
        // and are request-specific.
        url,
        action,
        // @ts-expect-errors
        provider,
        cookies: {
            ...cookie.defaultCookies(authOptions.useSecureCookies ?? url.protocol === "https:"),
            // Allow user cookie options to override any cookie settings above
            ...authOptions.cookies,
        },
        providers,
        // Session options
        session: {
            // If no adapter specified, force use of JSON Web Tokens (stateless)
            strategy: authOptions.adapter ? "database" : "jwt",
            maxAge,
            updateAge: 24 * 60 * 60,
            generateSessionToken: () => crypto.randomUUID(),
            ...authOptions.session,
        },
        // JWT options
        jwt: {
            // Asserted in assert.ts
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            secret: authOptions.secret,
            maxAge: authOptions.session?.maxAge ?? maxAge,
            encode: jwt.encode,
            decode: jwt.decode,
            ...authOptions.jwt,
        },
        // Event messages
        events: eventsErrorHandler(authOptions.events ?? {}, logger),
        adapter: adapterErrorHandler(authOptions.adapter, logger),
        // Callback functions
        callbacks: { ...defaultCallbacks, ...authOptions.callbacks },
        logger,
        callbackUrl: url.origin,
        isOnRedirectProxy,
    };
    // Init cookies
    const cookies = [];
    if (!csrfDisabled) {
        const { csrfToken, cookie: csrfCookie, csrfTokenVerified, } = await createCSRFToken({
            options,
            cookieValue: reqCookies?.[options.cookies.csrfToken.name],
            isPost,
            bodyValue: reqCsrfToken,
        });
        options.csrfToken = csrfToken;
        options.csrfTokenVerified = csrfTokenVerified;
        if (csrfCookie) {
            cookies.push({
                name: options.cookies.csrfToken.name,
                value: csrfCookie,
                options: options.cookies.csrfToken.options,
            });
        }
    }
    const { callbackUrl, callbackUrlCookie } = await createCallbackUrl({
        options,
        cookieValue: reqCookies?.[options.cookies.callbackUrl.name],
        paramValue: reqCallbackUrl,
    });
    options.callbackUrl = callbackUrl;
    if (callbackUrlCookie) {
        cookies.push({
            name: options.cookies.callbackUrl.name,
            value: callbackUrlCookie,
            options: options.cookies.callbackUrl.options,
        });
    }
    return { options, cookies };
}
/** Wraps an object of methods and adds error handling. */
function eventsErrorHandler(methods, logger) {
    return Object.keys(methods).reduce((acc, name) => {
        acc[name] = async (...args) => {
            try {
                const method = methods[name];
                return await method(...args);
            }
            catch (e) {
                logger.error(new EventError(e));
            }
        };
        return acc;
    }, {});
}
/** Handles adapter induced errors. */
function adapterErrorHandler(adapter, logger) {
    if (!adapter)
        return;
    return Object.keys(adapter).reduce((acc, name) => {
        acc[name] = async (...args) => {
            try {
                logger.debug(`adapter_${name}`, { args });
                const method = adapter[name];
                return await method(...args);
            }
            catch (e) {
                const error = new AdapterError(e);
                logger.error(error);
                throw error;
            }
        };
        return acc;
    }, {});
}
