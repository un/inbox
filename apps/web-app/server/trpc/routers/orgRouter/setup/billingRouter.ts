import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, eeProcedure } from '../../../trpc';
import { eq, and, sql } from '@uninbox/database/orm';
import {
  lifetimeLicenses,
  orgBilling,
  orgMembers,
  orgs
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';

const planNames = ['free', 'starter', 'pro'] as const;
type PlanName = (typeof planNames)[number];

const featureNames = [
  'customDomains',
  'userGroups',
  'catchAll',
  'multiDestinationEmails'
] as const;
type FeatureName = (typeof featureNames)[number];

const featurePlanMap: Record<FeatureName, PlanName[]> = {
  customDomains: ['starter', 'pro'],
  userGroups: ['starter', 'pro'],
  catchAll: ['pro'],
  multiDestinationEmails: ['pro']
};

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
        },
        with: {
          lifetimeLicenses: {
            columns: {
              id: true
            }
          }
        }
      });

      const totalLifetimeUsers = orgBillingQuery?.lifetimeLicenses.length || 0;
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
        lifetimeUsers: totalLifetimeUsers,
        currentPlan: orgPlan,
        currentPeriod: orgPeriod
      };
    }),
  getUserLifetimeLicenses: eeProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;

      if (!queryUserId || queryUserId === 0) {
        throw new Error('User not logged in');
      }

      const userLifetimeLicenses =
        await db.read.query.lifetimeLicenses.findMany({
          where: eq(lifetimeLicenses.userId, queryUserId),
          columns: {
            publicId: true
          },
          with: {
            orgBillingProfile: {
              columns: {},
              with: {
                org: {
                  columns: {
                    publicId: true,
                    name: true,
                    avatarId: true
                  }
                }
              }
            }
          }
        });

      const count = userLifetimeLicenses.length;
      return {
        count: count,
        licenses: userLifetimeLicenses
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
            totalOrgUsers: +activeOrgMembersCount[0].count,
            lifetimeUsers: 0
          }
        );

      if (!orgSubLink.link) {
        throw new Error('Org not subscribed to a plan');
      }
      return {
        subLink: orgSubLink.link
      };
    }),
  getLifetimePaymentLink: eeProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;

      if (!queryUserId || queryUserId === 0) {
        throw new Error('User not logged in');
      }

      const lifetimePurchaseLink =
        await billingTrpcClient.stripe.links.createLifetimePaymentLink.mutate({
          userId: +queryUserId
        });

      if (!lifetimePurchaseLink.link) {
        throw new Error('No Lifetime Purchase Link');
      }
      return {
        lifetimeLink: lifetimePurchaseLink.link
      };
    }),
  canUseFeature: eeProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        feature: z.enum([...featureNames])
      })
    )
    .query(async ({ ctx, input }) => {
      const queryUserId = ctx.user.userId || 0;
      const db = ctx.db;
      const { orgPublicId, feature } = input;

      const userOrg = await isUserInOrg({ userId: queryUserId, orgPublicId });
      if (!userOrg || userOrg.role !== 'admin') {
        throw new Error('User not in org');
      }
      if (userOrg.role !== 'admin') {
        throw new Error('User not the admin');
      }

      const orgBillingResponse = await db.read.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, userOrg.orgId),
        columns: {
          plan: true
        }
      });
      const orgPlan = orgBillingResponse?.plan || 'free';
      const allowedPlans = featurePlanMap[feature];
      return {
        canUse: allowedPlans.includes(orgPlan),
        allowedPlans: allowedPlans
      };
    })
});
