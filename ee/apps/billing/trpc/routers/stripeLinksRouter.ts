import { stripePlans, stripeBillingPeriods, stripeSdk } from '../../stripe';
import { router, protectedProcedure } from '../trpc';
import { orgBilling } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { env } from '../../env';
import { z } from 'zod';

export const stripeLinksRouter = router({
  createCheckoutSession: protectedProcedure
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

      const checkoutSession = await stripeSdk.checkout.sessions.create({
        ui_mode: 'embedded',
        metadata: { orgId },
        line_items: [{ price: planPriceId, quantity: totalOrgUsers }],
        subscription_data: {
          description: subscriptionDescription,
          metadata: {
            orgId,
            totalUsers: input.totalOrgUsers
          }
        },
        allow_promotion_codes: true,
        mode: 'subscription',
        redirect_on_completion: 'never'
      });

      if (!checkoutSession.client_secret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session'
        });
      }

      return {
        id: checkoutSession.id,
        clientSecret: checkoutSession.client_secret
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
        customer: orgBillingQuery.stripeCustomerId,
        return_url: `${env.WEBAPP_URL}`
      });

      return {
        link: portalLink.url
      };
    })
});
