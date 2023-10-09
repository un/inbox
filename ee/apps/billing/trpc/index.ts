export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';
import { stripeLinksRouter } from './routers/stripeLinksRouter';

export const trpcBillingContext = createContext;

const stripeRouter = router({
  links: stripeLinksRouter
});

export const trpcBillingRouter = router({
  stripe: stripeRouter
});

export type TrpcBillingRouter = typeof trpcBillingRouter;
