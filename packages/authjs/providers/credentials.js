/**
 * The Credentials provider allows you to handle signing in with arbitrary credentials,
 * such as a username and password, domain, or two factor authentication or hardware device (e.g. YubiKey U2F / FIDO).
 *
 * It is intended to support use cases where you have an existing system you need to authenticate users against.
 *
 * It comes with the constraint that users authenticated in this manner are not persisted in the database,
 * and consequently that the Credentials provider can only be used if JSON Web Tokens are enabled for sessions.
 *
 * :::warning **NOTE**
 *
 * The functionality provided for credentials based authentication is
 * **intentionally limited** to _discourage_ use of passwords
 * due to the _inherent security risks_ associated with them
 * and the _additional complexity_ associated
 * with supporting usernames and passwords.
 *
 * :::
 *
 * See the [callbacks documentation](/reference/configuration/auth-config#callbacks) for more information on how to interact with the token. For example, you can add additional information to the token by returning an object from the `jwt()` callback:
 *
 * ```js
 * callbacks: {
 *   async jwt(token, user, account, profile, isNewUser) {
 *     if (user) {
 *       token.id = user.id
 *     }
 *     return token
 *   }
 * }
 * ```
 *
 * @example
 * ```js
 * import Auth from "@auth/core"
 * import Credentials from "@auth/core/providers/credentials"
 *
 * const request = new Request("https://example.com")
 * const response = await AuthHandler(request, {
 *   providers: [
 *     Credentials({
 *       credentials: {
 *         username: { label: "Username" },
 *         password: {  label: "Password", type: "password" }
 *       },
 *       async authorize({ request }) {
 *         const response = await fetch(request)
 *         if(!response.ok) return null
 *         return await response.json() ?? null
 *       }
 *     })
 *   ],
 *   secret: "...",
 *   trustHost: true,
 * })
 * ```
 * @see [Username/Password Example](https://authjs.dev/guides/providers/credentials#example---username--password)
 * @see [Web3/Signin With Ethereum Example](https://authjs.dev/guides/providers/credentials#example---web3--signin-with-ethereum)
 */
export default function Credentials(config) {
    return {
        id: "credentials",
        name: "Credentials",
        type: "credentials",
        credentials: {},
        authorize: () => null,
        // @ts-expect-error
        options: config,
    };
}
