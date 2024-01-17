export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { orgRouter } from './routers/orgRouter';
import { emailRoutesRouter } from './routers/emailRoutesRouter';
import { domainRouter } from './routers/domainRouter';
import { sendMailRouter } from './routers/sendMailRouter';

export const trpcMailBridgeContext = createContext;
export const trpcMailBridgePostalRouter = router({
  org: orgRouter,
  domains: domainRouter,
  emailRoutes: emailRoutesRouter
});
export const trpcMailBridgeMailRouter = router({
  send: sendMailRouter
});
export const trpcMailBridgeRouter = router({
  mail: trpcMailBridgeMailRouter,
  postal: trpcMailBridgePostalRouter
});

export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;
