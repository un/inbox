// exported types
export type { TrpcBillingRouter } from './trpc';

export const stripePlanNames = ['starter', 'pro'] as const;
export const stripeBillingPeriods = ['monthly', 'yearly'] as const;

export type StripePlanName = (typeof stripePlanNames)[number];

export type StripeBillingPeriod = (typeof stripeBillingPeriods)[number];

type PlanIds = {
  [K in StripeBillingPeriod]: string;
};

export type StripeData = {
  plans: Record<StripePlanName, PlanIds>;
  key: string;
  webhookKey: string;
};
