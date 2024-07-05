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
  }),
  space: orgProcedure.query(async ({ ctx }) => {
    const { org, selfHosted } = ctx;
    if (selfHosted) {
      return {
        open: true,
        private: true
      };
    }
    return await billingTrpcClient.iCanHaz.space.query({ orgId: org.id });
  }),
  spaceStatus: orgProcedure.query(async ({ ctx }) => {
    const { org, selfHosted } = ctx;
    if (selfHosted) {
      return {
        open: 8,
        active: 8,
        closed: 8
      };
    }
    return await billingTrpcClient.iCanHaz.spaceStatus.query({ orgId: org.id });
  }),
  spaceTag: orgProcedure.query(async ({ ctx }) => {
    const { org, selfHosted } = ctx;
    if (selfHosted) {
      return {
        open: true,
        private: true
      };
    }
    return await billingTrpcClient.iCanHaz.spaceTag.query({ orgId: org.id });
  })
});

export const iCanHazCallerFactory = createCallerFactory(iCanHazRouter);
