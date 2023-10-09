import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../trpc';
import { useStripe } from '../../utils/useStripe';
import { stripeBillingPeriods, stripePlanNames } from '../../types';
import { and, eq } from '@uninbox/database/orm';
import { orgBilling } from '@uninbox/database/schema';
// import {
//   postalServers,
//   orgPostalConfigs,
//   domains
// } from '@uninbox/database/schema';
// import { nanoId, nanoIdLength } from '@uninbox/utils';

export const stripeLinksRouter = router({
  createSubscriptionPaymentLink: protectedProcedure
    .input(
      z.object({
        orgId: z.number().min(1),
        plan: z.enum(stripePlanNames),
        period: z.enum(stripeBillingPeriods),
        totalOrgUsers: z.number().min(1),
        lifetimeUsers: z.number().min(0).optional().default(0)
      })
    )
    .mutation(async ({ ctx, input }) => {
      //const { config, db } = ctx;
      const { stripe } = ctx;
      const { orgId, totalOrgUsers, lifetimeUsers } = input;

      const planPriceId = stripe.plans[input.plan][input.period];
      const chargeableUsers = totalOrgUsers - lifetimeUsers;
      const subscriptionDescription =
        lifetimeUsers > 0
          ? `Total users: ${totalOrgUsers} (${chargeableUsers} paid + ${lifetimeUsers} lifetime)`
          : `Total users: ${totalOrgUsers}`;

      const paymentLink = await useStripe().sdk.paymentLinks.create({
        metadata: {
          orgId
        },
        line_items: [
          {
            price: planPriceId,
            quantity: chargeableUsers
          }
        ],
        subscription_data: {
          description: subscriptionDescription,
          //@ts-ignore metadata not typed correctly
          metadata: {
            orgId,
            plan: input.plan,
            period: input.period,
            totalUsers: input.totalOrgUsers,
            chargeableUsers: input.lifetimeUsers
          }
        }
      });

      return {
        link: paymentLink.url
      };
    }),
  createLifetimePaymentLink: protectedProcedure
    .input(
      z.object({
        userId: z.number().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      //const { config, db } = ctx;
      const { stripe } = ctx;
      const { userId } = input;

      const currentLifetimeProductId = stripe.lifetime.current;
      const paymentLink = await useStripe().sdk.paymentLinks.create({
        metadata: {
          userId
        },
        line_items: [
          {
            price: currentLifetimeProductId,
            quantity: 1,
            adjustable_quantity: {
              enabled: true,
              minimum: 1,
              maximum: 9
            }
          }
        ]
      });

      return {
        link: paymentLink.url
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
      const { stripe, db } = ctx;
      const { orgId } = input;

      const orgBillingQuery = await db.read.query.orgBilling.findFirst({
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
