import { createNuxtApiHandler } from 'trpc-nuxt';
import {
  trpcWebAppRouter,
  trpcWebAppContext as createContext
} from '../../trpc';

// export API handler
export default createNuxtApiHandler({
  router: trpcWebAppRouter,
  createContext
});
