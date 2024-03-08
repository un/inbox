import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../trpc';
import { useStripe } from '../../utils/useStripe';
import { stripeBillingPeriods, stripePlanNames } from '../../types';
import { and, eq, sql } from '@u22n/database/orm';
import { orgBilling, orgMembers, users } from '@u22n/database/schema';
// import {
//   postalServers,
//   orgPostalConfigs,
//   domains
// } from '@u22n/database/schema';
// import { nanoId, nanoIdLength } from '@u22n/utils';

export const subscriptionsRouter = router({
  updateOrgUserCount: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { stripe, db } = ctx;
      const { orgId } = input;

      const orgSubscriptionQuery = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          id: true,
          orgId: true,
          stripeSubscriptionId: true,
          stripeCustomerId: true,
          plan: true,
          period: true
        }
      });
      if (!orgSubscriptionQuery?.id) {
        return { error: 'Org is not subscribed to a plan' };
      }

      const activeOrgMembersCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.orgId, orgId), eq(orgMembers.status, 'active'))
        );

      const totalOrgUsers = activeOrgMembersCount[0].count;

      const stripeGetSubscriptionResult =
        await useStripe().sdk.subscriptions.retrieve(
          orgSubscriptionQuery.stripeSubscriptionId
        );

      await useStripe().sdk.subscriptions.update(
        orgSubscriptionQuery.stripeSubscriptionId,
        {
          description: `Total users: ${totalOrgUsers}`,
          items: [
            {
              id: stripeGetSubscriptionResult.items.data[0].id,
              quantity: totalOrgUsers
            }
          ],
          proration_behavior: 'always_invoice',
          metadata: {
            orgId,
            product: 'subscription',
            plan: stripeGetSubscriptionResult.metadata.plan,
            period: stripeGetSubscriptionResult.metadata.period,
            totalUsers: totalOrgUsers
          }
        }
      );

      return {
        updated: true
      };
    })
});
