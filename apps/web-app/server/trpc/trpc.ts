import {
  TRPCError,
  initTRPC,
  experimental_standaloneMiddleware
} from '@trpc/server';
import superjson from 'superjson';
import { Context } from './createContext';
import * as z from 'zod';

export const trpcContext = initTRPC
  .context<Context>()
  .create({ transformer: superjson });

const isUserAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.user.valid) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next();
});
const isEeEnabled = trpcContext.middleware(({ next }) => {
  if (useRuntimeConfig().billing.enabled !== true) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Enterprise Edition features are disabled on this server'
    });
  }
  return next();
});

//TODO: check when standalone middleware is no longer experimental or fix inputs in standard middleware
const turnstileTokenValidation = experimental_standaloneMiddleware<{
  input: { turnstileToken: string }; // defaults to 'unknown' if not defined
}>().create(async (opts) => {
  if (!opts.input.turnstileToken) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Missing Turnstile Verfication Token'
    });
  }

  const token = await verifyTurnstileToken(opts.input.turnstileToken);
  if (!token.success)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid Turnstile Verfication Token'
    });

  return opts.next();
});

export const publicProcedure = trpcContext.procedure;
export const limitedProcedure = trpcContext.procedure
  .input(z.object({ turnstileToken: z.string() }))
  .use(turnstileTokenValidation);
export const protectedProcedure =
  trpcContext.procedure.use(isUserAuthenticated);
export const eeProcedure = protectedProcedure.use(isEeEnabled);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
