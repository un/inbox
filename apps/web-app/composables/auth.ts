// import { Hanko } from '@teamhanko/hanko-frontend-sdk';

// /**
//  * This composable returns a Hanko instance.
//  *
//  * It will be `null` on the server but defined on the client.
//  */
// export function useHanko() {
//   if (process.server) {
//     return null;
//   }

//   const { apiURL, cookieName } = useRuntimeConfig().public.hanko as {
//     apiURL: string;
//     cookieName: string;
//   };

//   return new Hanko(apiURL, {
//     cookieName: cookieName,
//     localStorageKey: cookieName
//   });
// }
