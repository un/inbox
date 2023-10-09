// exported types
export type { TrpcBillingRouter } from './trpc';

export const stripePlanNames = ['free', 'starter', 'pro'] as const;
export const stripeBillingPeriods = ['monthly', 'yearly'] as const;

export type StripePlanName = (typeof stripePlanNames)[number];

export type StripeBillingPeriod = (typeof stripeBillingPeriods)[number];

type PlanIds = {
  [K in StripeBillingPeriod]: string;
};

type LifetimeIds = {
  current: string;
  previous: string[] | null;
};

export type StripeData = {
  plans: Record<StripePlanName, PlanIds>;
  lifetime: LifetimeIds | null;
  key: string;
  webhookKey: string;
};
