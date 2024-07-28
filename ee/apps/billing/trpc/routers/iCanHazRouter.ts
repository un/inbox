import { domains, orgBilling, orgs } from '@u22n/database/schema';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { z } from 'zod';

export const iCanHazRouter = router({
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
        where: eq(domains.orgId, orgId),
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
    })
});
