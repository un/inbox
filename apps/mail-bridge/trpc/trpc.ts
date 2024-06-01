import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { TRPCContext } from '../ctx';

export const trpcContext = initTRPC
  .context<TRPCContext>()
  .create({ transformer: superjson });

const isServiceAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});

export const publicProcedure = trpcContext.procedure.use(
  async ({ ctx, type, path, next }) =>
    ctx.context
      .get('otel')
      .tracer.startActiveSpan(`TRPC ${type} ${path}`, async (span) => {
        const result = await next();
        span.setAttributes({
          'trpc.ok': result.ok
        });
        span.end();
        return result;
      })
);
export const protectedProcedure = publicProcedure.use(isServiceAuthenticated);
export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
