import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, eeProcedure } from '../../../trpc';
import { eq, and, sql } from '@uninbox/database/orm';
import { orgBilling, orgMembers, orgs } from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';

const planNames = ['free', 'starter', 'pro'] as const;
type PlanName = (typeof planNames)[number];

export const billingRouter = router({
  getOrgBillingOverview: eeProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId } = input;

      const userOrg = await isUserInOrg({ userId: queryUserId, orgPublicId });
      if (!userOrg) {
        throw new Error('User not in org');
      }

      const orgBillingQuery = await db.read.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, userOrg.orgId),
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
          and(
            eq(orgMembers.orgId, userOrg.orgId),
            eq(orgMembers.status, 'active')
          )
        );

      return {
        totalUsers: activeOrgMembersCount[0].count,
        currentPlan: orgPlan,
        currentPeriod: orgPeriod
      };
    }),
  getOrgStripePortalLink: eeProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId } = input;

      const userOrg = await isUserInOrg({ userId: queryUserId, orgPublicId });
      if (!userOrg || userOrg.role !== 'admin') {
        throw new Error('User not in org');
      }
      if (userOrg.role !== 'admin') {
        throw new Error('User not the admin');
      }

      const orgPortalLink =
        await billingTrpcClient.stripe.links.getPortalLink.query({
          orgId: +userOrg.orgId
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
        orgPublicId: z.string().min(3).max(nanoIdLength),
        plan: z.enum(['starter', 'pro']),
        period: z.enum(['monthly', 'yearly'])
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId, plan, period } = input;

      const userOrg = await isUserInOrg({ userId: queryUserId, orgPublicId });
      if (!userOrg || userOrg.role !== 'admin') {
        throw new Error('User not in org');
      }
      if (userOrg.role !== 'admin') {
        throw new Error('User not the admin');
      }

      const orgSubscriptionQuery = await db.read.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, userOrg.orgId),
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
          and(
            eq(orgMembers.orgId, userOrg.orgId),
            eq(orgMembers.status, 'active')
          )
        );

      const orgSubLink =
        await billingTrpcClient.stripe.links.createSubscriptionPaymentLink.mutate(
          {
            orgId: +userOrg.orgId,
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
  isPro: eeProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId } = input;

      const userOrg = await isUserInOrg({ userId: queryUserId, orgPublicId });
      if (!userOrg) {
        throw new Error('User not in org');
      }

      const orgBillingResponse = await db.read.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, userOrg.orgId),
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
