import { createNuxtApiHandler } from 'trpc-nuxt';
import {
  trpcCommandRouter,
  trpcCommandContext as createContext
} from '../../trpc';

// export API handler
export default createNuxtApiHandler({
  router: trpcCommandRouter,
  createContext
});
