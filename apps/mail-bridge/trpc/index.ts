export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { orgRouter } from './routers/orgRouter';
import { emailRoutesRouter } from './routers/emailRoutesRouter';

export const trpcMailBridgeContext = createContext;
export const trpcMailBridgePostalRouter = router({
  org: orgRouter,
  emailRoutes: emailRoutesRouter
});
export const trpcMailBridgeRouter = router({
  postal: trpcMailBridgePostalRouter
});

export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;
