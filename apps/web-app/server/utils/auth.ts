// import { H3Event, createError, getCookie, getHeader } from 'h3';
// import type { SessionConfig } from 'h3';
// import { createLocalJWKSet, jwtVerify } from 'jose';
// import { db } from '@uninbox/database';
// import { eq, and } from '@uninbox/database/orm';
// import { userAuthIdentities } from '@uninbox/database/schema';
// import { parse, stringify } from 'superjson';

// // @ts-ignore - The sameSite property is not typed for Nuxt but implemented in h3
// const sessionConfig: SessionConfig = useRuntimeConfig().auth || {};

// export type AuthSession = {
//   userId: number;
//   hankoUserId: string;
//   createdAt: number;
//   expiresAt: number;
// };
// export type ValidatedAuthSessionObject = Awaited<
//   ReturnType<typeof validateAuthSession>
// >;
// export type EventSessionObject = Awaited<ReturnType<typeof useSession>>;

// export const useAuthSession = async (event: H3Event) => {
//   const session = await useSession<AuthSession>(event, sessionConfig);
//   return session;
// };

// export async function verifyHankoJwt(event: H3Event) {
//   const jwks = createLocalJWKSet(useRuntimeConfig().hankoJwks);
//   const jwt = getCookie(event, useRuntimeConfig().public.hanko.cookieName);
//   if (!jwt) {
//     throw createError({
//       statusCode: 401
//     });
//   }

//   const jwtPayload = await jwtVerify(jwt, jwks).then((r) => r.payload);

//   //! Workaround for hanko cookie expiry not being set properly - see: https://github.com/teamhanko/hanko/issues/1007
//   const expiryTime = jwtPayload.exp;
//   setCookie(event, useRuntimeConfig().public.hanko.cookieName, jwt, {
//     expires: new Date(expiryTime! * 1000),
//     secure: true
//   });
//   //! End workaround

//   return jwtPayload;
// }

// const verifySessionData = async (eventSession: EventSessionObject) => {
//   if (!eventSession.id) return false;

//   const storedSession: AuthSession | null = await useStorage(
//     'sessions'
//   ).getItem(eventSession.id);
//   if (!storedSession) return false;

//   // object keys are not always in the same order, need to evaluate 1 by 1
//   if (
//     storedSession.userId !== eventSession.data.userId ||
//     storedSession.hankoUserId !== eventSession.data.hankoUserId ||
//     storedSession.createdAt !== eventSession.data.createdAt ||
//     storedSession.expiresAt !== eventSession.data.expiresAt
//   ) {
//     return false;
//   }
//   return true;
// };

// export const userLookupByHankoId = async (hankoId: string) => {
//   const authIdentityLookup = await db
//     .select({ userId: userAuthIdentities.userId })
//     .from(userAuthIdentities)
//     .where(
//       and(
//         eq(userAuthIdentities.provider, 'hanko'),
//         eq(userAuthIdentities.providerId, hankoId)
//       )
//     );
//   if (!authIdentityLookup.length) {
//     return {
//       userId: null
//     };
//   }
//   return {
//     userId: authIdentityLookup[0].userId
//   };
// };

// export const getAuthSession = async (event: H3Event) => {
//   const session = await useSession<AuthSession>(event, sessionConfig);
//   return session;
// };

// export const validateAuthSession = async (event: H3Event) => {
//   const eventSession = await useSession<AuthSession>(event, sessionConfig);
//   const eventHanko = await verifyHankoJwt(event).catch(() => undefined);

//   if (!eventSession.data.userId) {
//     if (eventHanko?.sub) {
//       event.context.hankoId = eventHanko.sub;
//       const userLookup = await userLookupByHankoId(eventHanko.sub);
//       if (!userLookup.userId) {
//         return {
//           session: eventSession,
//           valid: null,
//           userId: null,
//           reauth: false
//         };
//       }
//       const newSessionData = {
//         userId: userLookup.userId,
//         hankoUserId: eventHanko.sub,
//         createdAt: Date.now(),
//         expiresAt: Date.now() + useRuntimeConfig().auth.maxAge * 1000
//       };
//       const newSessionObject = await eventSession.update(newSessionData);
//       await useStorage('sessions').setItem(newSessionObject.id, newSessionData);

//       return {
//         session: eventSession,
//         valid: true,
//         userId: userLookup.userId,
//         reauth: false
//       };
//     } else {
//       eventSession.clear();
//       return {
//         session: eventSession,
//         valid: false,
//         userId: null,
//         reauth: false
//       };
//     }
//   }
//   // if no hanko id, return a "reauth: true" - will need to handle elsewhere
//   if (!eventHanko?.sub) {
//     const verifiedSession = await verifySessionData(eventSession);
//     if (!verifiedSession) {
//       eventSession.clear();
//       return {
//         session: eventSession,
//         valid: false,
//         userId: null,
//         reauth: false
//       };
//     }

//     return {
//       session: eventSession,
//       valid: true,
//       userId: eventSession.data.userId,
//       reauth: true
//     };
//   }

//   const verifiedSession = await verifySessionData(eventSession);
//   if (!verifiedSession) {
//     eventSession.clear();
//     return { session: eventSession, valid: false, userId: null, reauth: false };
//   }

//   if (eventSession.data.hankoUserId !== eventHanko?.sub) {
//     console.log(
//       '🚨 session mismatch, try clearing cookies and logging back in'
//     );
//     eventSession.clear();
//     return { session: eventSession, valid: false, userId: null, reauth: false };
//   }
//   return {
//     session: eventSession,
//     valid: true,
//     userId: eventSession.data.userId,
//     reauth: false
//   };
// };

// export async function useHash(str: string) {
//   const msgUint8 = new TextEncoder().encode(str);
//   const hashBuffer = await crypto.subtle.digest('SHA-512', msgUint8);
//   const hashArray = Array.from(new Uint8Array(hashBuffer));
//   const hashHex = hashArray
//     .map((b) => b.toString(16).padStart(2, '0'))
//     .join('');
//   return hashHex;
// }
