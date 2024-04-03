import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './createContext';
// import { getRequestIP } from 'h3';

export const trpcContext = initTRPC
  .context<Context>()
  .create({ transformer: superjson });

const isAccountAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.account || !ctx.account.id || !ctx.account.username) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in'
    });
  }
  return next({
    ctx
  });
});

export const accountProcedure = trpcContext.procedure.use(
  isAccountAuthenticated
);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
