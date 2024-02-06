// import Passkey from '@auth/core/providers/passkey';
// // import GithubProvider from '@auth/core/providers/github';
// import type { AuthConfig } from '@auth/core/types';
// import { NuxtAuthHandler } from '#auth';
// import { customDrizzleAdapter } from '../../utils/authjsDbAdaptor';

// const runtimeConfig = useRuntimeConfig();

// // Refer to Auth.js docs for more details
// export const authOptions: AuthConfig = {
//   secret: runtimeConfig.authJs.secret,
//   adapter: customDrizzleAdapter(),
//   providers: [
//     // {
//     //   type: 'email',
//     //   id: 'email',
//     //   name: 'Email',
//     //   server: null,
//     //   from: 'admin',
//     //   maxAge: 60 * 30,
//     //   options: {},
//     //   async generateVerificationToken() {
//     //     const random = crypto.getRandomValues(new Uint8Array(8));
//     //     return await Buffer.from(random).toString('hex').slice(0, 6);
//     //   },
//     //   async sendVerificationRequest({ identifier: email, url, token }) {
//     //     const username = email.split(':')[0];
//     //     const emailAddress = email.split(':')[1];
//     //     console.log('sendVerificationRequest', {
//     //       email,
//     //       url,
//     //       token,
//     //       username,
//     //       emailAddress,
//     //     });
//     //   },
//     // },
//     Passkey({
//       relayingParty: {
//         name: 'My awesome app',
//         id: 'localhost',
//         origin: runtimeConfig.public.siteUrl
//       }
//     })
//   ],
//   cookies: {
//     sessionToken: {
//       name: `un.session-token`,
//       options: {
//         httpOnly: true,
//         sameSite: 'lax',
//         path: '/',
//         secure: true
//       }
//     },
//     callbackUrl: {
//       name: `un.callback-url`,
//       options: {
//         sameSite: 'lax',
//         path: '/',
//         secure: true
//       }
//     },
//     challenge: {
//       name: `un.challenge`,
//       options: {
//         httpOnly: true,
//         sameSite: 'lax',
//         path: '/',
//         secure: true
//       }
//     },
//     csrfToken: {
//       name: `un.csrf-token`,
//       options: {
//         httpOnly: true,
//         sameSite: 'lax',
//         path: '/',
//         secure: true
//       }
//     },
//     pkceCodeVerifier: {
//       name: `un.pkce.code_verifier`,
//       options: {
//         httpOnly: true,
//         sameSite: 'lax',
//         path: '/',
//         secure: true,
//         maxAge: 900
//       }
//     },
//     state: {
//       name: `un.state`,
//       options: {
//         httpOnly: true,
//         sameSite: 'lax',
//         path: '/',
//         secure: true,
//         maxAge: 900
//       }
//     },
//     nonce: {
//       name: `un.nonce`,
//       options: {
//         httpOnly: true,
//         sameSite: 'lax',
//         path: '/',
//         secure: true
//       }
//     }
//   }
// };

// export default NuxtAuthHandler(authOptions, runtimeConfig);
