import type { HonoContext } from '@u22n/hono';
import type Stripe from 'stripe';

export type Ctx = HonoContext<{
  stripeEvent: Stripe.Event;
}>;
