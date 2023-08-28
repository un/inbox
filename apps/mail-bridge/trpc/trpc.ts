import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { CreateContext } from './createContext';

export const trpcContext = initTRPC
  .context<CreateContext>()
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
