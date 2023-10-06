// exported types
export type { TrpcBillingRouter } from './trpc';

export enum StripePlanName {
  Starter = 'starter',
  Pro = 'pro'
}

export enum StripeBillingPeriod {
  Monthly = 'monthly',
  Yearly = 'yearly'
}

type Plan = {
  [StripeBillingPeriod.Monthly]: string;
  [StripeBillingPeriod.Yearly]: string;
};

type Lifetime = {
  current: string;
  previous: string[] | null;
};

export type StripeData = {
  plans: Record<StripePlanName, Plan>;
  lifetime: Lifetime | null;
  key: string;
  webhookKey: string;
};
