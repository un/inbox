/**
 *
 *
 * This module contains functions and types
 * to encode and decode {@link https://authjs.dev/concepts/session-strategies#jwt JWT}s
 * issued and used by Auth.js.
 *
 * The JWT issued by Auth.js is _encrypted by default_, using the _A256GCM_ algorithm ({@link https://www.rfc-editor.org/rfc/rfc7516 JWE}).
 * It uses the `AUTH_SECRET` environment variable to derive a sufficient encryption key.
 *
 * :::info Note
 * Auth.js JWTs are meant to be used by the same app that issued them.
 * If you need JWT authentication for your third-party API, you should rely on your Identity Provider instead.
 * :::
 *
 * ## Installation
 *
 * ```bash npm2yarn2pnpm
 * npm install @auth/core
 * ```
 *
 * You can then import this submodule from `@auth/core/jwt`.
 *
 * ## Usage
 *
 * :::warning Warning
 * This module *will* be refactored/changed. We do not recommend relying on it right now.
 * :::
 *
 *
 * ## Resources
 *
 * - [What is a JWT session strategy](https://authjs.dev/concepts/session-strategies#jwt)
 * - [RFC7519 - JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519)
 *
 * @module jwt
 */
import { hkdf } from "@panva/hkdf";
import { EncryptJWT, jwtDecrypt } from "jose";
import { SessionStore } from "./lib/cookie.js";
import { MissingSecret } from "./errors.js";
const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const now = () => (Date.now() / 1000) | 0;
/** Issues a JWT. By default, the JWT is encrypted using "A256GCM". */
export async function encode(params) {
    const { token = {}, secret, maxAge = DEFAULT_MAX_AGE } = params;
    const encryptionSecret = await getDerivedEncryptionKey(secret);
    // @ts-expect-error `jose` allows any object as payload.
    return await new EncryptJWT(token)
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setIssuedAt()
        .setExpirationTime(now() + maxAge)
        .setJti(crypto.randomUUID())
        .encrypt(encryptionSecret);
}
/** Decodes a Auth.js issued JWT. */
export async function decode(params) {
    const { token, secret } = params;
    if (!token)
        return null;
    const encryptionSecret = await getDerivedEncryptionKey(secret);
    const { payload } = await jwtDecrypt(token, encryptionSecret, {
        clockTolerance: 15,
    });
    return payload;
}
export async function getToken(params) {
    const { req, secureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ??
        !!process.env.VERCEL, cookieName = secureCookie
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token", raw, decode: _decode = decode, logger = console, secret = process.env.AUTH_SECRET, } = params;
    if (!req)
        throw new Error("Must pass `req` to JWT getToken()");
    if (!secret)
        throw new MissingSecret("Must pass `secret` if not set to JWT getToken()");
    const sessionStore = new SessionStore({ name: cookieName, options: { secure: secureCookie } }, 
    // @ts-expect-error
    { cookies: req.cookies, headers: req.headers }, logger);
    let token = sessionStore.value;
    const authorizationHeader = req.headers instanceof Headers
        ? req.headers.get("authorization")
        : req.headers.authorization;
    if (!token && authorizationHeader?.split(" ")[0] === "Bearer") {
        const urlEncodedToken = authorizationHeader.split(" ")[1];
        token = decodeURIComponent(urlEncodedToken);
    }
    if (!token)
        return null;
    if (raw)
        return token;
    try {
        return await _decode({ token, secret });
    }
    catch {
        return null;
    }
}
async function getDerivedEncryptionKey(secret) {
    return await hkdf("sha256", secret, "", "Auth.js Generated Encryption Key", 32);
}
