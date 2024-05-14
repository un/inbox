import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { db } from '@u22n/database';
import type { stripeData } from '../stripe';

export const trpcContext = initTRPC
  .context<{
    auth: boolean;
    stripe: typeof stripeData;
    db: typeof db;
  }>()
  .create({ transformer: superjson });

export const publicProcedure = trpcContext.procedure;
export const protectedProcedure = trpcContext.procedure.use(({ next, ctx }) => {
  if (!ctx.auth) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next();
});
export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
