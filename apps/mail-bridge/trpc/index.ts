export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { postalConfigRouter } from './routers/postalConfigRouter';

export const trpcMailBridgeContext = createContext;
export const trpcMailBridgeRouter = router({
  postal: postalConfigRouter
});

export type TrpcMailBridgeRouter = typeof trpcMailBridgeRouter;
