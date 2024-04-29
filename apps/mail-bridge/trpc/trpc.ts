import { TRPCError, initTRPC } from '@trpc/server';
import type { db } from '@u22n/database';
import superjson from 'superjson';
import type { env } from '../env';
import type { Context } from 'hono';

export const trpcContext = initTRPC
  .context<{
    auth: boolean;
    db: typeof db;
    config: typeof env;
    context: Context;
  }>()
  .create({ transformer: superjson });

const isServiceAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      authed: ctx.auth
    }
  });
});

export const publicProcedure = trpcContext.procedure;
export const protectedProcedure = trpcContext.procedure.use(
  isServiceAuthenticated
);
export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
