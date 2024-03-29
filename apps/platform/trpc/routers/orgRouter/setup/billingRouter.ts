import { z } from 'zod';
import { router, eeProcedure } from '../../../trpc';
import { eq, and, sql } from '@u22n/database/orm';
import { orgBilling, orgMembers } from '@u22n/database/schema';
import { isAccountAdminOfOrg } from '../../../../utils/account';
import { TRPCError } from '@trpc/server';
import { billingTrpcClient } from '../../../../utils/tRPCServerClients';

export const billingRouter = router({
  getOrgBillingOverview: eeProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const orgBillingQuery = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          plan: true,
          period: true
        }
      });

      const orgPlan = orgBillingQuery?.plan || 'free';
      const orgPeriod = orgBillingQuery?.period || 'monthly';

      const activeOrgMembersCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.orgId, orgId), eq(orgMembers.status, 'active'))
        );

      return {
        totalUsers: activeOrgMembersCount[0]?.count,
        currentPlan: orgPlan,
        currentPeriod: orgPeriod
      };
    }),
  getOrgStripePortalLink: eeProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { org } = ctx;
      const orgId = org?.id;

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const orgPortalLink =
        await billingTrpcClient.stripe.links.getPortalLink.query({
          orgId: orgId
        });

      if (!orgPortalLink.link) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Org not subscribed to a plan'
        });
      }
      return {
        portalLink: orgPortalLink.link
      };
    }),
  getOrgSubscriptionPaymentLink: eeProcedure
    .input(
      z.object({
        plan: z.enum(['starter', 'pro']),
        period: z.enum(['monthly', 'yearly'])
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;
      const { plan, period } = input;

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const orgSubscriptionQuery = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          id: true
        }
      });
      if (orgSubscriptionQuery?.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Org already subscribed to a plan'
        });
      }

      const activeOrgMembersCountResponse = await db
        .select({ count: sql<number>`count(*)` })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.orgId, orgId), eq(orgMembers.status, 'active'))
        );

      const activeOrgMembersCount = Number(
        activeOrgMembersCountResponse[0]?.count || '0'
      );
      const orgSubLink =
        await billingTrpcClient.stripe.links.createSubscriptionPaymentLink.mutate(
          {
            orgId: orgId,
            plan: plan,
            period: period,
            totalOrgUsers: activeOrgMembersCount
          }
        );

      if (!orgSubLink.link) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Org not subscribed to a plan'
        });
      }
      return {
        subLink: orgSubLink.link
      };
    }),
  isPro: eeProcedure.input(z.object({})).query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org?.id || 0;

    const orgBillingResponse = await db.query.orgBilling.findFirst({
      where: eq(orgBilling.orgId, orgId),
      columns: {
        plan: true
      }
    });
    const orgPlan = orgBillingResponse?.plan || 'free';
    return {
      isPro: orgPlan === 'pro'
    };
  })
});
