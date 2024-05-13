import Stripe from 'stripe';
import { env } from './env';

export const stripeSdk = new Stripe(env.BILLING_STRIPE_KEY, {
  apiVersion: '2023-10-16'
});

export const stripeData = {
  plans: {
    pro: {
      monthly: env.BILLING_STRIPE_PLAN_PRO_MONTHLY_ID,
      yearly: env.BILLING_STRIPE_PLAN_PRO_YEARLY_ID
    }
  },
  key: env.BILLING_STRIPE_KEY,
  webhookKey: env.BILLING_STRIPE_WEBHOOK_KEY
};

export const stripePlans = ['pro'] as const;
export const stripeBillingPeriods = ['monthly', 'yearly'] as const;
