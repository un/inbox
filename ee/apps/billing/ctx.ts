import type Stripe from 'stripe';

export type Ctx = {
  Variables: {
    stripeEvent: Stripe.Event;
  };
};
