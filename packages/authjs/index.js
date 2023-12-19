/**
 *
 * :::warning Experimental
 * `@auth/core` is under active development.
 * :::
 *
 * This is the main entry point to the Auth.js library.
 *
 * Based on the {@link https://developer.mozilla.org/en-US/docs/Web/API/Request Request}
 * and {@link https://developer.mozilla.org/en-US/docs/Web/API/Response Response} Web standard APIs.
 * Primarily used to implement [framework](https://authjs.dev/concepts/frameworks)-specific packages,
 * but it can also be used directly.
 *
 * ## Installation
 *
 * ```bash npm2yarn2pnpm
 * npm install @auth/core
 * ```
 *
 * ## Usage
 *
 * ```ts
 * import { Auth } from "@auth/core"
 *
 * const request = new Request("https://example.com")
 * const response = await Auth(request, {...})
 *
 * console.log(response instanceof Response) // true
 * ```
 *
 * ## Resources
 *
 * - [Getting started](https://authjs.dev/getting-started/introduction)
 * - [Most common use case guides](https://authjs.dev/guides)
 *
 * @module index
 */
import { assertConfig } from "./lib/assert.js";
import { ErrorPageLoop } from "./errors.js";
import { AuthInternal, raw, skipCSRFCheck } from "./lib/index.js";
import renderPage from "./lib/pages/index.js";
import { logger, setLogger } from "./lib/utils/logger.js";
import { toInternalRequest, toResponse } from "./lib/web.js";
export { skipCSRFCheck, raw };
/**
 * Core functionality provided by Auth.js.
 *
 * Receives a standard {@link Request} and returns a {@link Response}.
 *
 * @example
 * ```ts
 * import Auth from "@auth/core"
 *
 * const request = new Request("https://example.com")
 * const response = await AuthHandler(request, {
 *   providers: [...],
 *   secret: "...",
 *   trustHost: true,
 * })
 *```
 * @see [Documentation](https://authjs.dev)
 */
export async function Auth(request, config) {
    setLogger(config.logger, config.debug);
    const internalRequest = await toInternalRequest(request);
    if (internalRequest instanceof Error) {
        logger.error(internalRequest);
        return new Response(`Error: This action with HTTP ${request.method} is not supported.`, { status: 400 });
    }
    const assertionResult = assertConfig(internalRequest, config);
    if (Array.isArray(assertionResult)) {
        assertionResult.forEach(logger.warn);
    }
    else if (assertionResult instanceof Error) {
        // Bail out early if there's an error in the user config
        logger.error(assertionResult);
        const htmlPages = ["signin", "signout", "error", "verify-request"];
        if (!htmlPages.includes(internalRequest.action) ||
            internalRequest.method !== "GET") {
            return new Response(JSON.stringify({
                message: "There was a problem with the server configuration. Check the server logs for more information.",
                code: assertionResult.name,
            }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        const { pages, theme } = config;
        const authOnErrorPage = pages?.error &&
            internalRequest.url.searchParams
                .get("callbackUrl")
                ?.startsWith(pages.error);
        if (!pages?.error || authOnErrorPage) {
            if (authOnErrorPage) {
                logger.error(new ErrorPageLoop(`The error page ${pages?.error} should not require authentication`));
            }
            const render = renderPage({ theme });
            const page = render.error({ error: "Configuration" });
            return toResponse(page);
        }
        return Response.redirect(`${pages.error}?error=Configuration`);
    }
    const internalResponse = await AuthInternal(internalRequest, config);
    // @ts-expect-error TODO: Fix return type
    if (config.raw === raw)
        return internalResponse;
    const response = await toResponse(internalResponse);
    // If the request expects a return URL, send it as JSON
    // instead of doing an actual redirect.
    const redirect = response.headers.get("Location");
    if (request.headers.has("X-Auth-Return-Redirect") && redirect) {
        response.headers.delete("Location");
        response.headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify({ url: redirect }), {
            status: internalResponse.status,
            headers: response.headers,
        });
    }
    return response;
}
