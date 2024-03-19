import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { useStripe } from '../../utils/useStripe';
import { stripeBillingPeriods, stripePlanNames } from '../../types';
import { eq } from '@u22n/database/orm';
import { orgBilling } from '@u22n/database/schema';

export const stripeLinksRouter = router({
  createSubscriptionPaymentLink: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        plan: z.enum(stripePlanNames),
        period: z.enum(stripeBillingPeriods),
        totalOrgUsers: z.number().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      //const { config, db } = ctx;
      const { stripe } = ctx;
      const { orgId, totalOrgUsers } = input;

      const planPriceId = stripe.plans[input.plan][input.period];
      const subscriptionDescription = `Total users: ${totalOrgUsers}`;

      const subscribeToPlan = await useStripe().sdk.paymentLinks.create({
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
          //@ts-ignore metadata not typed correctly
          metadata: {
            orgId,
            product: 'subscription',
            plan: input.plan,
            period: input.period,
            totalUsers: input.totalOrgUsers
          }
        }
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
      //const { config, db } = ctx;
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

      const portalLink = await useStripe().sdk.billingPortal.sessions.create({
        customer: orgBillingQuery?.stripeCustomerId
      });

      return {
        link: portalLink.url
      };
    })
});
