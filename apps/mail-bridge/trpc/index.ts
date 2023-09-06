export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { postalPuppetRouter } from './routers/postalPuppetRouter';

export const trpcMailBridgeContext = createContext;
export const trpcMailBridgeRouter = router({
  postal: postalPuppetRouter
});

export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;
