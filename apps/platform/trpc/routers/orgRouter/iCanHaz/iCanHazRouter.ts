import { router, orgProcedure, createCallerFactory } from '~platform/trpc/trpc';
import { billingTrpcClient } from '~platform/utils/tRPCServerClients';

export const iCanHazRouter = router({
  billing: orgProcedure.query(async ({ ctx }) => {
    const { selfHosted } = ctx;
    if (selfHosted) {
      return false;
    }
    return await billingTrpcClient.iCanHaz.billing.query();
  }),
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
  spaceWorkflow: orgProcedure.query(async ({ ctx }) => {
    const { org, selfHosted } = ctx;
    if (selfHosted) {
      return {
        open: 8,
        active: 8,
        closed: 8
      };
    }
    return await billingTrpcClient.iCanHaz.spaceWorkflow.query({
      orgId: org.id
    });
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
