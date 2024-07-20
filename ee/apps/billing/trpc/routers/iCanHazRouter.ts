import { domains, orgBilling, orgs } from '@u22n/database/schema';
import type { SpaceWorkflowType } from '@u22n/utils/spaces';
import { router, protectedProcedure } from '../trpc';
import { and, eq } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const iCanHazRouter = router({
  billing: protectedProcedure.query(() => true),
  domain: protectedProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const orgId = input.orgId;

      const orgBillingResponse = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          plan: true
        }
      });
      if (orgBillingResponse && orgBillingResponse.plan === 'pro') {
        return true;
      }

      //for skiff users
      const orgQuery = await db.query.orgs.findFirst({
        where: eq(orgs.id, orgId),
        columns: {
          id: true,
          metadata: true
        }
      });

      if (!orgQuery) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Org does not exist'
        });
      }
      const orgMetadata = orgQuery.metadata;

      // get the bonus where item matches domain
      const domainBonus = orgMetadata?.bonuses?.find(
        (bonus) => bonus.item === 'domain'
      );

      if (!domainBonus || !('count' in domainBonus.bonus)) {
        return false;
      }

      const allowedDomains: number = domainBonus.bonus.count;

      const domainQuery = await db.query.domains.findMany({
        where: and(eq(domains.orgId, orgId), eq(domains.disabled, false)),
        columns: {
          id: true
        }
      });
      const domainCount = domainQuery?.length || 0;

      if (domainCount < allowedDomains) {
        return true;
      }

      return false;
    }),
  team: protectedProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const orgId = input.orgId;

      const orgBillingResponse = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          plan: true
        }
      });
      if (orgBillingResponse && orgBillingResponse.plan === 'pro') {
        return true;
      }
      return false;
    }),
  space: protectedProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const orgId = input.orgId;

      const orgBillingResponse = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          plan: true
        }
      });
      if (orgBillingResponse && orgBillingResponse.plan === 'pro') {
        return {
          open: true,
          private: true
        };
      }
      return {
        open: true,
        private: false
      };
    }),
  spaceWorkflow: protectedProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const orgId = input.orgId;

      let allowedWorkflows: Record<SpaceWorkflowType, number> = {
        open: 1,
        active: 1,
        closed: 1
      };

      const orgBillingResponse = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          plan: true
        }
      });
      if (orgBillingResponse && orgBillingResponse.plan === 'pro') {
        allowedWorkflows = {
          open: 5,
          active: 8,
          closed: 5
        };
      }
      return allowedWorkflows;
    }),
  spaceTag: protectedProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const orgId = input.orgId;

      const orgBillingResponse = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          plan: true
        }
      });
      if (orgBillingResponse && orgBillingResponse.plan === 'pro') {
        return {
          open: true,
          private: true
        };
      }
      return {
        open: true,
        private: false
      };
    })
});
