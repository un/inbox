import { router } from './trpc';
import { orgRouter } from './routers/orgRoutes';
import { accountRouter } from './routers/accountRouter';
import { internalRouter } from './routers/internalRouter';

export const trpcCommandRouter = router({
  orgs: orgRouter,
  accounts: accountRouter,
  internal: internalRouter
});

export type TrpcCommandRouter = typeof trpcCommandRouter;
