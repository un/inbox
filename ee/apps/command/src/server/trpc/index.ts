import { internalRouter } from './routers/internalRouter';
import { accountRouter } from './routers/accountRouter';
import { orgRouter } from './routers/orgRoutes';
import { router } from './trpc';

export const trpcCommandRouter = router({
  orgs: orgRouter,
  accounts: accountRouter,
  internal: internalRouter
});

export type TrpcCommandRouter = typeof trpcCommandRouter;
