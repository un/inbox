import {
  TRPCError,
  initTRPC,
  experimental_standaloneMiddleware
} from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './createContext';
import * as z from 'zod';

export const trpcContext = initTRPC
  .context<Context>()
  .create({ transformer: superjson });

const isUserAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.user || !ctx.user.session.valid || !ctx.user.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in, redirecting...'
    });
  }
  return next();
});
const hasOrgSlug = trpcContext.middleware(({ next, ctx }) => {
  //@ts-ignore
  const orgId = +ctx.org?.id;
  //@ts-ignore
  const userId = +ctx.user?.id;
  const orgMemberUserIds = ctx.org?.members.map((member) => member.userId);
  const isUserInOrg = orgMemberUserIds?.includes(userId);
  if (!ctx.user || !ctx.user.session.valid || !ctx.user.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in, redirecting...'
    });
  }
  if (!orgId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid organization selected, redirecting...'
    });
  }
  if (!isUserInOrg) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not a member of this organization, redirecting...'
    });
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
    if (process.env.NODE_ENV === 'development') return opts.next();
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Missing Turnstile Verification Token'
    });
  }

  const token = await verifyTurnstileToken(opts.input.turnstileToken);
  if (!token.success)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid Turnstile Verification Token'
    });

  return opts.next();
});

export const publicProcedure = trpcContext.procedure;
export const limitedProcedure = trpcContext.procedure
  .input(z.object({ turnstileToken: z.string() }))
  .use(turnstileTokenValidation);
export const userProcedure = trpcContext.procedure.use(isUserAuthenticated);
export const orgProcedure = trpcContext.procedure.use(hasOrgSlug);
export const eeProcedure = orgProcedure.use(isEeEnabled);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
