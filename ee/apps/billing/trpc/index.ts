export * from '@trpc/server';
import { router } from './trpc';
import { createContext } from './createContext';

export const trpcBillingContext = createContext;
export const trpcBillingRouter = router({});

export type TrpcBillingRouter = typeof trpcBillingRouter;
