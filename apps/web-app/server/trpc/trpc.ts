import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './createContext';

export const trpcContext = initTRPC
  .context<Context>()
  .create({ transformer: superjson });

const isUserAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.session.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.session.userId
    }
  });
});

export const publicProcedure = trpcContext.procedure;
export const protectedProcedure =
  trpcContext.procedure.use(isUserAuthenticated);
export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
