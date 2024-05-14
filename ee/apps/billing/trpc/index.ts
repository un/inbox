export * from '@trpc/server';
import { router } from './trpc';
import { stripeLinksRouter } from './routers/stripeLinksRouter';
import { subscriptionsRouter } from './routers/subscriptionsRouter';

const stripeRouter = router({
  links: stripeLinksRouter,
  subscriptions: subscriptionsRouter
});

export const trpcBillingRouter = router({
  stripe: stripeRouter
});

export type TrpcBillingRouter = typeof trpcBillingRouter;
