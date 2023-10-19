export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { stripeLinksRouter } from './routers/stripeLinksRouter';
import { subscriptionsRouter } from './routers/subscriptionsRouter';

export const trpcBillingContext = createContext;

const stripeRouter = router({
  links: stripeLinksRouter,
  subscriptions: subscriptionsRouter
});

export const trpcBillingRouter = router({
  stripe: stripeRouter
});

export type TrpcBillingRouter = typeof trpcBillingRouter;
