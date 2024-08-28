import { stripePlans, stripeBillingPeriods, stripeSdk } from '../../stripe';
import { router, protectedProcedure } from '../trpc';
import { orgBilling } from '@u22n/database/schema';
import { eq } from '@u22n/database/orm';
import { z } from 'zod';

export const stripeLinksRouter = router({
  createSubscriptionPaymentLink: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        plan: z.enum(stripePlans),
        period: z.enum(stripeBillingPeriods),
        totalOrgUsers: z.number().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { stripe } = ctx;
      const { orgId, totalOrgUsers } = input;

      const planPriceId = stripe.plans[input.plan][input.period];
      const subscriptionDescription = `Total users: ${totalOrgUsers}`;

      const subscribeToPlan = await stripeSdk.paymentLinks.create({
        metadata: {
          orgId
        },
        line_items: [
          {
            price: planPriceId,
            quantity: totalOrgUsers
          }
        ],
        subscription_data: {
          description: subscriptionDescription,
          metadata: {
            orgId,
            product: 'subscription',
            plan: input.plan,
            period: input.period,
            totalUsers: input.totalOrgUsers
          }
        },
        allow_promotion_codes: true
      });

      return {
        link: subscribeToPlan.url
      };
    }),
  getPortalLink: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1)
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { orgId } = input;

      const orgBillingQuery = await db.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: {
          stripeCustomerId: true
        }
      });

      if (!orgBillingQuery?.stripeCustomerId)
        throw new Error('No stripe customer id');

      const portalLink = await stripeSdk.billingPortal.sessions.create({
        customer: orgBillingQuery?.stripeCustomerId
      });

      return {
        link: portalLink.url
      };
    })
});
