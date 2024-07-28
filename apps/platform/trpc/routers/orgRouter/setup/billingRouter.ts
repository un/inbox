import { domains, orgBilling, orgMembers, orgs } from '@u22n/database/schema';
import { billingTrpcClient } from '~platform/utils/tRPCServerClients';
import { isAccountAdminOfOrg } from '~platform/utils/account';
import { router, eeProcedure } from '~platform/trpc/trpc';
import { eq, and, sql } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const billingRouter = router({
  getOrgBillingOverview: eeProcedure
    .input(z.object({}))
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

      const orgPlan = orgBillingQuery?.plan ?? 'free';
      const orgPeriod = orgBillingQuery?.period ?? 'monthly';

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
    .input(z.object({}))
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
        plan: z.enum(['pro']),
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
        activeOrgMembersCountResponse[0]?.count ?? '0'
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
    const orgPlan = orgBillingResponse?.plan ?? 'free';
    return {
      isPro: orgPlan === 'pro'
    };
  }),
  canAddDomain: eeProcedure.input(z.object({})).query(async ({ ctx }) => {
    const { db, org } = ctx;

    const orgBillingResponse = await db.query.orgBilling.findFirst({
      where: eq(orgBilling.orgId, org.id),
      columns: {
        plan: true
      }
    });
    if (orgBillingResponse) {
      const orgPlan = orgBillingResponse?.plan || 'free';
      return {
        canAddDomain: orgPlan === 'pro'
      };
    }

    //for skiff users

    const orgQuery = await db.query.orgs.findFirst({
      where: eq(orgs.id, org.id),
      columns: {
        id: true,
        metadata: true
      }
    });

    if (!orgQuery) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User not in org'
      });
    }
    const orgMetadata = orgQuery.metadata;

    // get the bonus where item matches domain
    const domainBonus = orgMetadata?.bonuses?.find(
      (bonus) => bonus.item === 'domain'
    );

    if (!domainBonus || !('count' in domainBonus.bonus)) {
      return {
        canAddDomain: false
      };
    }

    const allowedDomains: number = domainBonus.bonus.count;

    const domainQuery = await db.query.domains.findMany({
      where: eq(domains.orgId, org.id),
      columns: {
        id: true
      }
    });
    const domainCount = domainQuery?.length || 0;

    if (domainCount < allowedDomains) {
      return {
        canAddDomain: true
      };
    }

    return {
      canAddDomain: false
    };
  })
});
