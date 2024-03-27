import { createH3ApiHandler } from 'trpc-nuxt';
import { trpcMailBridgeRouter } from '~/trpc';
import { createContext } from '~/trpc/createContext';

// export API handler
export default createH3ApiHandler({
  router: trpcMailBridgeRouter,
  createContext
});
