import { CallbackRouteError, MissingAdapter, OAuthCallbackError, Verification, } from "../../errors.js";
import { handleLogin } from "../callback-handler.js";
import { handleOAuth } from "../oauth/callback.js";
import { handleState } from "../oauth/handle-state.js";
import { createHash } from "../web.js";
import { handleAuthorized } from "./shared.js";
import { verifyAuthentication, verifyRegistration } from "../passkey/verify.js";
/** Handle callbacks from login services */
export async function callback(params) {
    const { options, query, body, method, headers, sessionStore, cookies: reqCookies, } = params;
    const { provider, adapter, url, callbackUrl, pages, jwt, events, callbacks, session: { strategy: sessionStrategy, maxAge: sessionMaxAge }, logger, } = options;
    const cookies = [];
    const useJwtSession = sessionStrategy === "jwt";
    try {
        if (provider.type === "oauth" || provider.type === "oidc") {
            const { proxyRedirect, randomState } = handleState(query, provider, options.isOnRedirectProxy);
            if (proxyRedirect) {
                logger.debug("proxy redirect", { proxyRedirect, randomState });
                return { redirect: proxyRedirect };
            }
            const authorizationResult = await handleOAuth(query, params.cookies, options, randomState);
            if (authorizationResult.cookies.length) {
                cookies.push(...authorizationResult.cookies);
            }
            logger.debug("authorization result", authorizationResult);
            const { user: userFromProvider, account, profile: OAuthProfile, } = authorizationResult;
            // If we don't have a profile object then either something went wrong
            // or the user cancelled signing in. We don't know which, so we just
            // direct the user to the signin page for now. We could do something
            // else in future.
            // TODO: Handle user cancelling signin
            if (!userFromProvider || !account || !OAuthProfile) {
                return { redirect: `${url}/signin`, cookies };
            }
            // Check if user is allowed to sign in
            // Attempt to get Profile from OAuth provider details before invoking
            // signIn callback - but if no user object is returned, that is fine
            // (that just means it's a new user signing in for the first time).
            let userByAccountOrFromProvider;
            if (adapter) {
                const { getUserByAccount } = adapter;
                const userByAccount = await getUserByAccount({
                    providerAccountId: account.providerAccountId,
                    provider: provider.id,
                });
                if (userByAccount)
                    userByAccountOrFromProvider = userByAccount;
            }
            const unauthorizedOrError = await handleAuthorized({
                user: userByAccountOrFromProvider,
                account,
                profile: OAuthProfile,
            }, options);
            if (unauthorizedOrError)
                return { ...unauthorizedOrError, cookies };
            // Sign user in
            const { user, session, isNewUser } = await handleLogin(sessionStore.value, userFromProvider, account, options);
            if (useJwtSession) {
                const defaultToken = {
                    name: user.name,
                    email: user.email,
                    picture: user.image,
                    sub: user.id?.toString(),
                };
                const token = await callbacks.jwt({
                    token: defaultToken,
                    user,
                    account,
                    profile: OAuthProfile,
                    isNewUser,
                    trigger: isNewUser ? "signUp" : "signIn",
                });
                // Clear cookies if token is null
                if (token === null) {
                    cookies.push(...sessionStore.clean());
                }
                else {
                    // Encode token
                    const newToken = await jwt.encode({ ...jwt, token });
                    // Set cookie expiry date
                    const cookieExpires = new Date();
                    cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000);
                    const sessionCookies = sessionStore.chunk(newToken, {
                        expires: cookieExpires,
                    });
                    cookies.push(...sessionCookies);
                }
            }
            else {
                // Save Session Token in cookie
                cookies.push({
                    name: options.cookies.sessionToken.name,
                    value: session.sessionToken,
                    options: {
                        ...options.cookies.sessionToken.options,
                        expires: session.expires,
                    },
                });
            }
            await events.signIn?.({ user, account, profile: OAuthProfile, isNewUser });
            // Handle first logins on new accounts
            // e.g. option to send users to a new account landing page on initial login
            // Note that the callback URL is preserved, so the journey can still be resumed
            if (isNewUser && pages.newUser) {
                return {
                    redirect: `${pages.newUser}${pages.newUser.includes("?") ? "&" : "?"}${new URLSearchParams({ callbackUrl })}`,
                };
            }
            return { redirect: callbackUrl, cookies };
        }
        else if (provider.type === "email") {
            const token = query?.token;
            const identifier = query?.email;
            if (!token || !identifier) {
                const e = new TypeError("Missing token or email. The sign-in URL was manually opened without token/identifier or the link was not sent correctly in the email.", { cause: { hasToken: !!token, hasEmail: !!identifier } });
                e.name = "Configuration";
                throw e;
            }
            const secret = provider.secret ?? options.secret;
            // @ts-expect-error -- Verified in `assertConfig`.
            const invite = await adapter.useVerificationToken({
                identifier,
                token: await createHash(`${token}${secret}`),
            });
            const hasInvite = !!invite;
            const expired = invite ? invite.expires.valueOf() < Date.now() : undefined;
            const invalidInvite = !hasInvite || expired;
            if (invalidInvite)
                throw new Verification({ hasInvite, expired });
            const user = (await adapter.getUserByEmail(identifier)) ?? {
                id: identifier,
                email: identifier,
                emailVerified: null,
            };
            const account = {
                providerAccountId: user.email,
                userId: user.id,
                type: "email",
                provider: provider.id,
            };
            // Check if user is allowed to sign in
            const unauthorizedOrError = await handleAuthorized({ user, account }, options);
            if (unauthorizedOrError)
                return { ...unauthorizedOrError, cookies };
            // Sign user in
            const { user: loggedInUser, session, isNewUser, } = await handleLogin(sessionStore.value, user, account, options);
            if (useJwtSession) {
                const defaultToken = {
                    name: loggedInUser.name,
                    email: loggedInUser.email,
                    picture: loggedInUser.image,
                    sub: loggedInUser.id?.toString(),
                };
                const token = await callbacks.jwt({
                    token: defaultToken,
                    user: loggedInUser,
                    account,
                    isNewUser,
                    trigger: isNewUser ? "signUp" : "signIn",
                });
                // Clear cookies if token is null
                if (token === null) {
                    cookies.push(...sessionStore.clean());
                }
                else {
                    // Encode token
                    const newToken = await jwt.encode({ ...jwt, token });
                    // Set cookie expiry date
                    const cookieExpires = new Date();
                    cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000);
                    const sessionCookies = sessionStore.chunk(newToken, {
                        expires: cookieExpires,
                    });
                    cookies.push(...sessionCookies);
                }
            }
            else {
                // Save Session Token in cookie
                cookies.push({
                    name: options.cookies.sessionToken.name,
                    value: session.sessionToken,
                    options: {
                        ...options.cookies.sessionToken.options,
                        expires: session.expires,
                    },
                });
            }
            await events.signIn?.({ user: loggedInUser, account, isNewUser });
            // Handle first logins on new accounts
            // e.g. option to send users to a new account landing page on initial login
            // Note that the callback URL is preserved, so the journey can still be resumed
            if (isNewUser && pages.newUser) {
                return {
                    redirect: `${pages.newUser}${pages.newUser.includes("?") ? "&" : "?"}${new URLSearchParams({ callbackUrl })}`,
                    cookies,
                };
            }
            // Callback URL is already verified at this point, so safe to use if specified
            return { redirect: callbackUrl, cookies };
        }
        else if (provider.type === "credentials" && method === "POST") {
            const credentials = body ?? {};
            // TODO: Forward the original request as is, instead of reconstructing it
            Object.entries(query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
            const user = await provider.authorize(credentials, 
            // prettier-ignore
            new Request(url, { headers, method, body: JSON.stringify(body) }));
            if (!user) {
                return {
                    status: 401,
                    redirect: `${url}/error?${new URLSearchParams({
                        error: "CredentialsSignin",
                        provider: provider.id,
                    })}`,
                    cookies,
                };
            }
            /** @type {import("src").Account} */
            const account = {
                providerAccountId: user.id,
                type: "credentials",
                provider: provider.id,
            };
            const unauthorizedOrError = await handleAuthorized({ user, account, credentials }, options);
            if (unauthorizedOrError)
                return { ...unauthorizedOrError, cookies };
            const defaultToken = {
                name: user.name,
                email: user.email,
                picture: user.image,
                sub: user.id?.toString(),
            };
            const token = await callbacks.jwt({
                token: defaultToken,
                user,
                // @ts-expect-error
                account,
                isNewUser: false,
                trigger: "signIn",
            });
            // Clear cookies if token is null
            if (token === null) {
                cookies.push(...sessionStore.clean());
            }
            else {
                // Encode token
                const newToken = await jwt.encode({ ...jwt, token });
                // Set cookie expiry date
                const cookieExpires = new Date();
                cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000);
                const sessionCookies = sessionStore.chunk(newToken, {
                    expires: cookieExpires,
                });
                cookies.push(...sessionCookies);
            }
            // @ts-expect-error
            await events.signIn?.({ user, account });
            return { redirect: callbackUrl, cookies };
        }
        else if (provider.type === "passkey" && method === "POST") {
            // Parse body
            const { action, data: _data, email } = body ?? {};
            if (!_data) {
                return {
                    redirect: `${options.url}/signin?error=MissingData`,
                    cookies,
                };
            }
            // Handle objects and stringified data
            let data = _data;
            if (typeof _data === "string") {
                data = JSON.parse(_data);
            }
            let user;
            let account;
            let authenticator;
            if (action === "authenticate") {
                // Authentication is akin to signing, but with a passkey.
                // To authenticate, we need to verify the data provided by the client
                // and compare that with an existing passkey and the challenge cookie
                // that was stored during the previous step of the authentication flow.
                const result = await verifyAuthentication(options, reqCookies, data);
                if (typeof result === "string") {
                    return {
                        redirect: `${url}/signin?error=${encodeURIComponent(result)}`,
                        cookies,
                    };
                }
                // If the verification was successful, set the user and account
                user = result.user;
                account = result.account;
            }
            else if (action === "register") {
                // Registration is akin to signing up, but with a passkey.
                // To register we do something similar to authentication, but we
                // don't have an existing authenticator to compare with. Instead we
                // use the challenge to verify that the entity that requested the
                // registration is the same as the one that is now attempting to
                // register. After that, we create a new authenticator, possubly
                // a new user and account, and then return theem.
                const result = await verifyRegistration(options, reqCookies, data, email);
                // If the response is a string, it's an error message.
                if (typeof result === "string") {
                    return {
                        redirect: `${url}/signin?error=${encodeURIComponent(result)}`,
                        cookies,
                    };
                }
                user = result.user;
                account = result.account;
                authenticator = result.authenticator;
            }
            else {
                return {
                    redirect: `${options.url}/signin?error=InvalidAction`,
                    cookies,
                };
            }
            // Check if user is allowed to sign in
            const unauthorizedOrError = await handleAuthorized({ user, account }, options);
            if (unauthorizedOrError)
                return { ...unauthorizedOrError, cookies };
            // Sign user in
            const { session, isNewUser } = await handleLogin(sessionStore.value, user, account, options);
            // Create a new authenticator if registering
            if (authenticator) {
                if (!adapter) {
                    throw new MissingAdapter("Adapter is required for passkey provider");
                }
                await adapter.createAuthenticator(authenticator);
            }
            if (useJwtSession) {
                const defaultToken = {
                    name: user.name,
                    email: user.email,
                    picture: user.image,
                    sub: user.id?.toString(),
                };
                const token = await callbacks.jwt({
                    token: defaultToken,
                    user,
                    account,
                    isNewUser,
                    trigger: isNewUser ? "signUp" : "signIn",
                });
                // Clear cookies if token is null
                if (token === null) {
                    cookies.push(...sessionStore.clean());
                }
                else {
                    // Encode token
                    const newToken = await jwt.encode({ ...jwt, token });
                    // Set cookie expiry date
                    const cookieExpires = new Date();
                    cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000);
                    const sessionCookies = sessionStore.chunk(newToken, {
                        expires: cookieExpires,
                    });
                    cookies.push(...sessionCookies);
                }
            }
            else {
                // Save Session Token in cookie
                cookies.push({
                    name: options.cookies.sessionToken.name,
                    value: session.sessionToken,
                    options: {
                        ...options.cookies.sessionToken.options,
                        expires: session.expires,
                    },
                });
            }
            await events.signIn?.({ user, account, isNewUser });
            // Handle first logins on new accounts
            // e.g. option to send users to a new account landing page on initial login
            // Note that the callback URL is preserved, so the journey can still be resumed
            if (isNewUser && pages.newUser) {
                return {
                    redirect: `${pages.newUser}${pages.newUser.includes("?") ? "&" : "?"}${new URLSearchParams({ callbackUrl })}`,
                    cookies,
                };
            }
            return { redirect: callbackUrl, cookies };
        }
        return {
            status: 500,
            body: `Error: Callback for provider type ${provider.type} not supported`,
            cookies,
        };
    }
    catch (e) {
        if (e instanceof OAuthCallbackError) {
            logger.error(e);
            // REVIEW: Should we expose original error= and error_description=
            // Should we use a different name for error= then, since we already use it for all kind of errors?
            url.searchParams.set("error", OAuthCallbackError.name);
            url.pathname += "/signin";
            return { redirect: url.toString(), cookies };
        }
        const error = new CallbackRouteError(e, { provider: provider.id });
        logger.debug("callback route error details", { method, query, body });
        logger.error(error);
        url.searchParams.set("error", CallbackRouteError.name);
        url.pathname += "/error";
        return { redirect: url.toString(), cookies };
    }
}
