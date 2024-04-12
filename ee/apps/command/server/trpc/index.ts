export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { orgRouter } from './routers/orgRoutes';
import { accountRouter } from './routers/accountRouter';

export const trpcCommandContext = createContext;

export const trpcCommandRouter = router({
  orgs: orgRouter,
  accounts: accountRouter
});

export type TrpcCommandRouter = typeof trpcCommandRouter;
