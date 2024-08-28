import { orgBilling, orgMembers } from '@u22n/database/schema';
import { router, protectedProcedure } from '../trpc';
import { and, eq, sql } from '@u22n/database/orm';
import { stripeSdk } from '../../stripe';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const subscriptionsRouter = router({
  getSubscriptionDates: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1)
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
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

      if (!orgSubscriptionQuery?.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Org is not subscribed to a plan'
        });
      }

      const { start_date, cancel_at_period_end, current_period_end } =
        await stripeSdk.subscriptions.retrieve(
          orgSubscriptionQuery.stripeSubscriptionId
        );

      return {
        start_date,
        cancel_at_period_end,
        current_period_end
      };
    }),
  updateOrgUserCount: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
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
        .select({ count: sql<string>`count(*)` })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.orgId, orgId), eq(orgMembers.status, 'active'))
        );

      const totalOrgUsers = Number(activeOrgMembersCount[0]?.count ?? '1');

      if (orgSubscriptionQuery.stripeSubscriptionId) {
        const stripeGetSubscriptionResult =
          await stripeSdk.subscriptions.retrieve(
            orgSubscriptionQuery.stripeSubscriptionId
          );

        if (
          stripeGetSubscriptionResult &&
          stripeGetSubscriptionResult.items?.data &&
          stripeGetSubscriptionResult.status === 'active'
        ) {
          await stripeSdk.subscriptions.update(
            orgSubscriptionQuery.stripeSubscriptionId,
            {
              description: `Total users: ${totalOrgUsers}`,
              items: [
                {
                  id: stripeGetSubscriptionResult.items.data[0]?.id,
                  quantity: totalOrgUsers
                }
              ],
              proration_behavior: 'always_invoice',
              metadata: {
                orgId,
                totalUsers: totalOrgUsers
              }
            }
          );
        }
      }

      console.info('🚀 Updated billing details 🎉', { orgId, totalOrgUsers });

      return {
        updated: true
      };
    }),
  cancelOrgSubscription: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
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

      if (orgSubscriptionQuery.stripeSubscriptionId) {
        const stripeGetSubscriptionResult =
          await stripeSdk.subscriptions.retrieve(
            orgSubscriptionQuery.stripeSubscriptionId
          );

        if (stripeGetSubscriptionResult) {
          await stripeSdk.subscriptions.update(
            orgSubscriptionQuery.stripeSubscriptionId,
            {
              cancel_at: Math.floor(new Date().getTime() / 1000)
            }
          );
        }
      }

      console.info('🫡 Cancelled billing for deleted org 💩', { orgId });

      return {
        updated: true
      };
    })
});
