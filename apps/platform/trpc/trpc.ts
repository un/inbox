import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { validateOrgShortCode } from '~platform/utils/orgShortCode';
import { type Duration, Ratelimit, NoopRatelimit } from '@unkey/ratelimit';
import type { TrpcContext } from '~platform/ctx';
import { z } from 'zod';
import { env } from '~platform/env';

export const trpcContext = initTRPC
  .context<TrpcContext>()
  .create({ transformer: superjson });

const isAccountAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.account) {
    ctx.event.header('Location', '/');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in, redirecting...'
    });
  }
  return next({
    ctx: { ...ctx, account: ctx.account }
  });
});

const isEeEnabled = trpcContext.middleware(({ next }) => {
  if (!env.EE_LICENSE_KEY) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Enterprise Edition features are disabled on this server'
    });
  }
  return next();
});

const publicRateLimits = {
  checkUsernameAvailability: [30, '1h'],
  checkPasswordStrength: [50, '1h'],
  generatePasskeyChallenge: [20, '1h'],
  signUpPasskeyStart: [10, '1h'],
  signUpPasskeyFinish: [10, '1h'],
  verifyPasskey: [30, '1h'],
  createTwoFactorChallenge: [10, '1h'],
  signUpWithPassword: [10, '1h'],
  signInWithPassword: [20, '1h'],
  recoverAccount: [10, '1h'],
  completeRecovery: [20, '1h'],
  validateInvite: [10, '1h']
} satisfies Record<string, [number, Duration]>;

function createRatelimiter({
  limit,
  duration,
  namespace
}: {
  limit: number;
  duration: Duration;
  namespace: string;
}) {
  const rootKey = env.UNKEY_ROOT_KEY;
  const unkey = rootKey
    ? new Ratelimit({
        async: true,
        limit,
        duration,
        namespace,
        rootKey
      })
    : new NoopRatelimit();

  return trpcContext.middleware(async ({ ctx, next }) => {
    const ip = ctx.event.env.incoming.socket.remoteAddress;
    const result = await unkey.limit(ip ?? 'unknown');
    if (!result.success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later'
      });
    }
    return next();
  });
}

export const publicProcedure = trpcContext.procedure;

export const publicRateLimitedProcedure = Object.entries(
  publicRateLimits
).reduce(
  (acc, [key, [limit, duration]]) => {
    acc[key as keyof typeof publicRateLimits] = trpcContext.procedure.use(
      createRatelimiter({ limit, duration, namespace: `public.${key}` })
    );
    return acc;
  },
  {} as Record<keyof typeof publicRateLimits, typeof publicProcedure>
);

export const accountProcedure = trpcContext.procedure.use(
  isAccountAuthenticated
);
export const orgProcedure = trpcContext.procedure
  .use(isAccountAuthenticated)
  .input(z.object({ orgShortCode: z.string() }))
  .use(async ({ input, ctx, next }) => {
    const { orgShortCode } = input;
    const orgData = await validateOrgShortCode(orgShortCode);

    if (!orgData) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found'
      });
    }

    const accountId = ctx.account.id;
    const orgMembership = orgData.members.find(
      (member) => member.accountId === accountId
    );

    if (!accountId || !orgMembership) {
      ctx.event.header('Location', '/');
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You are not a member of this organization, redirecting...'
      });
    }

    return next({
      ctx: {
        ...ctx,
        org: { ...orgData, memberId: orgMembership.id }
      }
    });
  });

export const eeProcedure = orgProcedure.use(isEeEnabled);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
