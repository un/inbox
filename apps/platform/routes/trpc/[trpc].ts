import { createNuxtApiHandler } from 'trpc-nuxt';
import {
  trpcPlatformRouter,
  trpcPlatformContext as createContext
} from '~/trpc';

// export API handler
export default createNuxtApiHandler({
  router: trpcPlatformRouter,
  createContext
});
