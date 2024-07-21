import { TRPCError, initTRPC } from '@trpc/server';
import { getTracer } from '@u22n/otel/helpers';
import { flatten } from '@u22n/otel/exports';
import type { TRPCContext } from '../ctx';
import superjson from 'superjson';

export const trpcContext = initTRPC
  .context<TRPCContext>()
  .create({ transformer: superjson });

const isServiceAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});

const trpcTracer = getTracer('mail-bridge/trpc');
export const publicProcedure = trpcContext.procedure.use(
  async ({ type, path, next }) =>
    trpcTracer.startActiveSpan(`TRPC ${type} ${path}`, async (span) => {
      const result = await next();
      if (span) {
        span.setAttributes(
          flatten({
            trpc: {
              type: type,
              path: path,
              ok: result.ok
            }
          })
        );
      }
      return result;
    })
);
export const protectedProcedure = publicProcedure.use(isServiceAuthenticated);
export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
