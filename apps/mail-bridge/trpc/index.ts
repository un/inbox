export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { orgRouter } from './routers/orgRouter';
import { emailRoutesRouter } from './routers/emailRoutesRouter';
import { domainRouter } from './routers/domainRouter';

export const trpcMailBridgeContext = createContext;
export const trpcMailBridgePostalRouter = router({
  org: orgRouter,
  domains: domainRouter,
  emailRoutes: emailRoutesRouter
});
export const trpcMailBridgeRouter = router({
  postal: trpcMailBridgePostalRouter
});

export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;
