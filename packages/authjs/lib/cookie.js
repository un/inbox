var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SessionStore_instances, _SessionStore_chunks, _SessionStore_option, _SessionStore_logger, _SessionStore_chunk, _SessionStore_clean;
import { base64url } from "jose";
import { decode, encode } from "../jwt.js";
import { DEFAULT_PASSKEY_TIMEOUT } from "../providers/passkey.js";
// Uncomment to recalculate the estimated size
// of an empty session cookie
// import { serialize } from "cookie"
// console.log(
//   "Cookie estimated to be ",
//   serialize(`__Secure.next-auth.session-token.0`, "", {
//     expires: new Date(),
//     httpOnly: true,
//     maxAge: Number.MAX_SAFE_INTEGER,
//     path: "/",
//     sameSite: "strict",
//     secure: true,
//     domain: "example.com",
//   }).length,
//   " bytes"
// )
const ALLOWED_COOKIE_SIZE = 4096;
// Based on commented out section above
const ESTIMATED_EMPTY_COOKIE_SIZE = 163;
const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE;
/**
 * Use secure cookies if the site uses HTTPS
 * This being conditional allows cookies to work non-HTTPS development URLs
 * Honour secure cookie option, which sets 'secure' and also adds '__Secure-'
 * prefix, but enable them by default if the site URL is HTTPS; but not for
 * non-HTTPS URLs like http://localhost which are used in development).
 * For more on prefixes see https://googlechrome.github.io/samples/cookie-prefixes/
 *
 * @TODO Review cookie settings (names, options)
 */
export function defaultCookies(useSecureCookies) {
    const cookiePrefix = useSecureCookies ? "__Secure-" : "";
    return {
        // default cookie options
        sessionToken: {
            name: `${cookiePrefix}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
        callbackUrl: {
            name: `${cookiePrefix}next-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
        csrfToken: {
            // Default to __Host- for CSRF token for additional protection if using useSecureCookies
            // NB: The `__Host-` prefix is stricter than the `__Secure-` prefix.
            name: `${useSecureCookies ? "__Host-" : ""}next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
        pkceCodeVerifier: {
            name: `${cookiePrefix}next-auth.pkce.code_verifier`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
                maxAge: 60 * 15, // 15 minutes in seconds
            },
        },
        state: {
            name: `${cookiePrefix}next-auth.state`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
                maxAge: 60 * 15, // 15 minutes in seconds
            },
        },
        nonce: {
            name: `${cookiePrefix}next-auth.nonce`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
        challenge: {
            name: `${cookiePrefix}next-auth.challenge`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: useSecureCookies,
                maxAge: DEFAULT_PASSKEY_TIMEOUT,
            },
        },
    };
}
export class SessionStore {
    constructor(option, req, logger) {
        _SessionStore_instances.add(this);
        _SessionStore_chunks.set(this, {});
        _SessionStore_option.set(this, void 0);
        _SessionStore_logger.set(this, void 0);
        __classPrivateFieldSet(this, _SessionStore_logger, logger, "f");
        __classPrivateFieldSet(this, _SessionStore_option, option, "f");
        const { cookies } = req;
        const { name: cookieName } = option;
        if (typeof cookies?.getAll === "function") {
            // Next.js ^v13.0.1 (Edge Env)
            for (const { name, value } of cookies.getAll()) {
                if (name.startsWith(cookieName)) {
                    __classPrivateFieldGet(this, _SessionStore_chunks, "f")[name] = value;
                }
            }
        }
        else if (cookies instanceof Map) {
            for (const name of cookies.keys()) {
                if (name.startsWith(cookieName))
                    __classPrivateFieldGet(this, _SessionStore_chunks, "f")[name] = cookies.get(name);
            }
        }
        else {
            for (const name in cookies) {
                if (name.startsWith(cookieName))
                    __classPrivateFieldGet(this, _SessionStore_chunks, "f")[name] = cookies[name];
            }
        }
    }
    /**
     * The JWT Session or database Session ID
     * constructed from the cookie chunks.
     */
    get value() {
        // Sort the chunks by their keys before joining
        const sortedKeys = Object.keys(__classPrivateFieldGet(this, _SessionStore_chunks, "f")).sort((a, b) => {
            const aSuffix = parseInt(a.split(".").pop() || "0");
            const bSuffix = parseInt(b.split(".").pop() || "0");
            return aSuffix - bSuffix;
        });
        // Use the sorted keys to join the chunks in the correct order
        return sortedKeys.map(key => __classPrivateFieldGet(this, _SessionStore_chunks, "f")[key]).join("");
    }
    /**
     * Given a cookie value, return new cookies, chunked, to fit the allowed cookie size.
     * If the cookie has changed from chunked to unchunked or vice versa,
     * it deletes the old cookies as well.
     */
    chunk(value, options) {
        // Assume all cookies should be cleaned by default
        const cookies = __classPrivateFieldGet(this, _SessionStore_instances, "m", _SessionStore_clean).call(this);
        // Calculate new chunks
        const chunked = __classPrivateFieldGet(this, _SessionStore_instances, "m", _SessionStore_chunk).call(this, {
            name: __classPrivateFieldGet(this, _SessionStore_option, "f").name,
            value,
            options: { ...__classPrivateFieldGet(this, _SessionStore_option, "f").options, ...options },
        });
        // Update stored chunks / cookies
        for (const chunk of chunked) {
            cookies[chunk.name] = chunk;
        }
        return Object.values(cookies);
    }
    /** Returns a list of cookies that should be cleaned. */
    clean() {
        return Object.values(__classPrivateFieldGet(this, _SessionStore_instances, "m", _SessionStore_clean).call(this));
    }
}
_SessionStore_chunks = new WeakMap(), _SessionStore_option = new WeakMap(), _SessionStore_logger = new WeakMap(), _SessionStore_instances = new WeakSet(), _SessionStore_chunk = function _SessionStore_chunk(cookie) {
    const chunkCount = Math.ceil(cookie.value.length / CHUNK_SIZE);
    if (chunkCount === 1) {
        __classPrivateFieldGet(this, _SessionStore_chunks, "f")[cookie.name] = cookie.value;
        return [cookie];
    }
    const cookies = [];
    for (let i = 0; i < chunkCount; i++) {
        const name = `${cookie.name}.${i}`;
        const value = cookie.value.substr(i * CHUNK_SIZE, CHUNK_SIZE);
        cookies.push({ ...cookie, name, value });
        __classPrivateFieldGet(this, _SessionStore_chunks, "f")[name] = value;
    }
    __classPrivateFieldGet(this, _SessionStore_logger, "f").debug("CHUNKING_SESSION_COOKIE", {
        message: `Session cookie exceeds allowed ${ALLOWED_COOKIE_SIZE} bytes.`,
        emptyCookieSize: ESTIMATED_EMPTY_COOKIE_SIZE,
        valueSize: cookie.value.length,
        chunks: cookies.map((c) => c.value.length + ESTIMATED_EMPTY_COOKIE_SIZE),
    });
    return cookies;
}, _SessionStore_clean = function _SessionStore_clean() {
    const cleanedChunks = {};
    for (const name in __classPrivateFieldGet(this, _SessionStore_chunks, "f")) {
        delete __classPrivateFieldGet(this, _SessionStore_chunks, "f")?.[name];
        cleanedChunks[name] = {
            name,
            value: "",
            options: { ...__classPrivateFieldGet(this, _SessionStore_option, "f").options, maxAge: 0 },
        };
    }
    return cleanedChunks;
};
export function encodePayload(payload) {
    return base64url.encode(JSON.stringify(payload));
}
/** Returns a signed cookie. */
export async function signCookie({ options, type, value, data, cookieOptions, }) {
    const { cookies } = options;
    const encoded = encodePayload(value);
    const payload = {
        value: encoded,
    };
    const maxAge = cookieOptions?.maxAge ?? cookies[type].options.maxAge;
    return [
        {
            name: cookies[type].name,
            value: await encode({
                ...options.jwt,
                maxAge,
                token: { ...payload, data },
            }),
            options: { ...cookies[type].options, ...cookieOptions },
        },
        encoded,
    ];
}
export function decodePayload(encoded) {
    return JSON.parse(new TextDecoder().decode(base64url.decode(encoded)));
}
/** Returns a signed cookie's data */
export async function decodeSignedCookie(type, cookies, options) {
    const name = options.cookies[type].name;
    const signed = cookies?.[name];
    if (!signed)
        return [null, null];
    const payload = await decode({
        ...options.jwt,
        token: signed,
    });
    if (!payload?.value)
        return [null, null];
    return [decodePayload(payload.value), payload.value];
}
