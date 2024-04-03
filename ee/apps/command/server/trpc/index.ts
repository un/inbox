export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { orgRouter } from './routers/orgRoutes';

export const trpcCommandContext = createContext;

export const trpcCommandRouter = router({
  orgs: orgRouter
});

export type TrpcCommandRouter = typeof trpcCommandRouter;
