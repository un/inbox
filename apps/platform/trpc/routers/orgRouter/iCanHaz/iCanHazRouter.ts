import { router, orgProcedure, createCallerFactory } from '~platform/trpc/trpc';
import { billingTrpcClient } from '~platform/utils/tRPCServerClients';

export const iCanHazRouter = router({
  domain: orgProcedure.query(async ({ ctx }) => {
    const { org, selfHosted } = ctx;
    if (selfHosted) {
      return true;
    }
    return await billingTrpcClient.iCanHaz.domain.query({ orgId: org.id });
  }),
  team: orgProcedure.query(async ({ ctx }) => {
    const { org, selfHosted } = ctx;
    if (selfHosted) {
      return true;
    }
    return await billingTrpcClient.iCanHaz.team.query({ orgId: org.id });
  })
});

export const iCanHazCallerFactory = createCallerFactory(iCanHazRouter);
