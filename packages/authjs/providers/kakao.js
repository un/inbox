/**
 * Add Kakao login to your page.
 *
 * ### Setup
 *
 * #### Callback URL
 * ```
 * https://example.com/api/auth/callback/kakao
 * ```
 *
 * #### Configuration
 *```js
 * import Auth from "@auth/core"
 * import Kakao from "@auth/core/providers/kakao"
 *
 * const request = new Request(origin)
 * const response = await Auth(request, {
 *   providers: [Kakao({ clientId: KAKAO_CLIENT_ID, clientSecret: KAKAO_CLIENT_SECRET })],
 * })
 * ```
 *
 * ### Resources
 *
 *  - [Kakao OAuth documentation](https://developers.kakao.com/product/kakaoLogin)
 *  - [Kakao OAuth configuration](https://developers.kakao.com/docs/latest/en/kakaologin/common)
 *
 * ## Configuration
 * Create a provider and a Kakao application at https://developers.kakao.com/console/app. In the settings of the app under Kakao Login, activate web app, change consent items and configure callback URL.
 *
 * ### Notes
 *
 * By default, Auth.js assumes that the Kakao provider is
 * based on the [OAuth 2](https://www.rfc-editor.org/rfc/rfc6749.html) specification.
 *
 * :::tip
 *
 * The Kakao provider comes with a [default configuration](https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/kakao.ts).
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
export default function Kakao(options) {
    return {
        id: "kakao",
        name: "Kakao",
        type: "oauth",
        authorization: "https://kauth.kakao.com/oauth/authorize?scope",
        token: "https://kauth.kakao.com/oauth/token",
        userinfo: "https://kapi.kakao.com/v2/user/me",
        client: {
            token_endpoint_auth_method: "client_secret_post",
        },
        profile(profile) {
            return {
                id: profile.id.toString(),
                name: profile.kakao_account?.profile?.nickname,
                email: profile.kakao_account?.email,
                image: profile.kakao_account?.profile?.profile_image_url,
            };
        },
        options,
    };
}
