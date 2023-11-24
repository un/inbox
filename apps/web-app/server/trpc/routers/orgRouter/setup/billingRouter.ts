import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, eeProcedure } from '../../../trpc';
import { eq, and, sql } from '@uninbox/database/orm';
import { orgBilling, orgMembers, orgs } from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { isUserAdminOfOrg } from '~/server/utils/user';
import { TRPCError } from '@trpc/server';

const planNames = ['free', 'starter', 'pro'] as const;
type PlanName = (typeof planNames)[number];

export const billingRouter = router({
  getOrgBillingOverview: eeProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;

      const isAdmin = await isUserAdminOfOrg(org, userId);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const orgBillingQuery = await db.read.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, +orgId),
        columns: {
          plan: true,
          period: true
        }
      });

      const orgPlan = orgBillingQuery?.plan || 'free';
      const orgPeriod = orgBillingQuery?.period || 'monthly';

      const activeOrgMembersCount = await db.read
        .select({ count: sql<number>`count(*)` })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.orgId, +orgId), eq(orgMembers.status, 'active'))
        );

      return {
        totalUsers: activeOrgMembersCount[0].count,
        currentPlan: orgPlan,
        currentPeriod: orgPeriod
      };
    }),
  getOrgStripePortalLink: eeProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;

      const isAdmin = await isUserAdminOfOrg(org, userId);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const orgPortalLink =
        await billingTrpcClient.stripe.links.getPortalLink.query({
          orgId: +orgId
        });

      if (!orgPortalLink.link) {
        throw new Error('Org not subscribed to a plan');
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
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;
      const { plan, period } = input;

      const isAdmin = await isUserAdminOfOrg(org, userId);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const orgSubscriptionQuery = await db.read.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, +orgId),
        columns: {
          id: true
        }
      });
      if (orgSubscriptionQuery?.id) {
        throw new Error('Org already subscribed to a plan');
      }

      const activeOrgMembersCount = await db.read
        .select({ count: sql<number>`count(*)` })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.orgId, +orgId), eq(orgMembers.status, 'active'))
        );

      const orgSubLink =
        await billingTrpcClient.stripe.links.createSubscriptionPaymentLink.mutate(
          {
            orgId: +orgId,
            plan: plan,
            period: period,
            totalOrgUsers: +activeOrgMembersCount[0].count
          }
        );

      if (!orgSubLink.link) {
        throw new Error('Org not subscribed to a plan');
      }
      return {
        subLink: orgSubLink.link
      };
    }),
  isPro: eeProcedure.input(z.object({})).query(async ({ ctx, input }) => {
    const { db, user, org } = ctx;
    const userId = user?.id || 0;
    const orgId = org?.id || 0;

    const orgBillingResponse = await db.read.query.orgBilling.findFirst({
      where: eq(orgBilling.orgId, +orgId),
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
