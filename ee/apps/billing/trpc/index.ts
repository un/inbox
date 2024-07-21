export * from '@trpc/server';
import { subscriptionsRouter } from './routers/subscriptionsRouter';
import { stripeLinksRouter } from './routers/stripeLinksRouter';
import { iCanHazRouter } from './routers/iCanHazRouter';
import { router } from './trpc';

const stripeRouter = router({
  links: stripeLinksRouter,
  subscriptions: subscriptionsRouter
});

export const trpcBillingRouter = router({
  stripe: stripeRouter,
  iCanHaz: iCanHazRouter
});

export type TrpcBillingRouter = typeof trpcBillingRouter;
