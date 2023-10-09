import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, eeProcedure } from '../../../trpc';
import { eq, and, sql } from '@uninbox/database/orm';
import { orgBilling, orgMembers, orgs } from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';

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
          orgId: userOrg.orgId
        });

      if (!orgPortalLink.link) {
        throw new Error('Org not subscribed to a plan');
      }
      return {
        portalLink: orgPortalLink.link
      };
    })
});
