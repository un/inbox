/**
 * Add Tiktok login to your page.
 *
 * ### Setup
 *
 * #### Callback URL
 * ```
 * https://example.com/api/auth/callback/tiktok
 * ```
 *
 * #### Configuration
 *```js
 * import Auth from "@auth/core"
 * import Tiktok from "@auth/core/providers/tiktok"
 *
 * const request = new Request(origin)
 * const response = await Auth(request, {
 *   providers: [Tiktok({ clientId: TIKTOK_CLIENT_KEY, clientSecret: TIKTOK_CLIENT_SECRET })],
 * })
 * ```
 *
 * ### Resources
 *  - [Tiktok app console](https://developers.tiktok.com/)
 *  - [Tiktok login kit documentation](https://developers.tiktok.com/doc/login-kit-web/)
 *  - [Avaliable Scopes](https://developers.tiktok.com/doc/tiktok-api-scopes/)
 *
 *
 * ### Notes
 *
 * :::tip
 *
 * Production applications cannot use localhost URLs to sign in with Tiktok. You need add the domain and Callback/Redirect url's to your Tiktok app and have them review and approved by the Tiktok Team.
 *
 * :::
 *
 * :::tip
 *
 * Email address is not supported by Tiktok.
 *
 * :::
 *
 * :::tip
 *
 * Client_ID will be the Client Key in the Tiktok Application
 *
 * :::
 *
 * By default, Auth.js assumes that the Tiktok provider is
 * based on the [OAuth 2](https://www.rfc-editor.org/rfc/rfc6749.html) specification.
 *
 * :::tip
 *
 * The Tiktok provider comes with a [default configuration](https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/tiktok.ts).
 * To override the defaults for your use case, check out [customizing a built-in OAuth provider](https://authjs.dev/guides/providers/custom-provider#override-default-options).
 *
 * :::
 *
 * :::info **Disclaimer**
 *
 * If you think you found a bug in the default configuration, you can [open an issue](https://authjs.dev/new/provider-issue).
 *
 * Auth.js strictly adheres to the specification and it cannot take responsibility for any deviation from
 * the spec by the provider. You can open an issue, but if the problem is non-compliance with the spec,
 * we might not pursue a resolution. You can ask for more help in [Discussions](https://authjs.dev/new/github-discussions).
 *
 * :::
 */
export default function Tiktok(options) {
    return {
        id: "tiktok",
        name: "TikTok",
        type: "oauth",
        authorization: {
            url: "https://www.tiktok.com/v2/auth/authorize",
            params: {
                client_key: options.clientId,
                scope: "user.info.profile",
                response_type: "code",
            },
        },
        token: {
            async request({ params, provider }) {
                const res = await fetch(`https://open.tiktokapis.com/v2/oauth/token/`, {
                    method: "POST",
                    headers: {
                        "Cache-Control": "no-cache",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                        client_key: provider.clientId,
                        client_secret: provider.clientSecret,
                        code: params.code,
                        grant_type: "authorization_code",
                        redirect_uri: provider.callbackUrl,
                    }),
                }).then((res) => res.json());
                const tokens = {
                    access_token: res.access_token,
                    expires_at: res.expires_in,
                    refresh_token: res.refresh_token,
                    scope: res.scope,
                    id_token: res.open_id,
                    token_type: res.token_type,
                    session_state: res.open_id,
                };
                return {
                    tokens,
                };
            },
        },
        userinfo: {
            url: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,username",
            async request({ tokens, provider }) {
                return await fetch(provider.userinfo?.url, {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                }).then(async (res) => await res.json());
            },
        },
        profile(profile) {
            return {
                id: profile.data.user.open_id,
                name: profile.data.user.display_name,
                image: profile.data.user.avatar_url,
                email: profile.data.user.email || null,
            };
        },
        style: {
            logo: "/tiktok.svg",
            bg: "#000",
            text: "#fff",
        },
        options,
    };
}
