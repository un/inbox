import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './createContext';
import { useRuntimeConfig } from '#imports';
import { type Duration, Ratelimit, NoopRatelimit } from '@unkey/ratelimit';
import { getRequestIP } from 'h3';

export const trpcContext = initTRPC
  .context<Context>()
  .create({ transformer: superjson });

const isAccountAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (
    !ctx.account ||
    !ctx.account.session.attributes.account.id ||
    !ctx.account.id
  ) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in, redirecting...'
    });
  }
  return next({
    ctx: { ...ctx, account: ctx.account }
  });
});

// It is not unstable - only the API might change in the future: https://trpc.io/docs/faq#unstable
const hasOrgShortcode = isAccountAuthenticated.unstable_pipe(
  ({ next, ctx }) => {
    if (!ctx.org) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid organization selected, redirecting...'
      });
    }

    const accountId = ctx.account?.id;
    const orgMembership = ctx.org?.members.find(
      (member) => member.accountId === accountId
    );

    if (!accountId || !orgMembership) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You are not a member of this organization, redirecting...'
      });
    }

    return next({
      ctx: {
        ...ctx,
        org: {
          ...ctx.org,
          memberId: orgMembership.id
        }
      }
    });
  }
);

const isEeEnabled = trpcContext.middleware(({ next }) => {
  if (!useRuntimeConfig().billing?.enabled) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Enterprise Edition features are disabled on this server'
    });
  }
  return next();
});

const publicRateLimits = {
  checkUsernameAvailability: [30, '1h'],
  checkPasswordStrength: [30, '1h'],
  generatePasskeyChallenge: [20, '1h'],
  signUpPasskeyStart: [10, '1h'],
  signUpPasskeyFinish: [10, '1h'],
  verifyPasskey: [30, '1h'],
  signUpWithPassword: [10, '1h'],
  signInWithPassword: [20, '1h'],
  recoverAccount: [10, '1h'],
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
  const rootKey = (useRuntimeConfig().unkey as any).rootKey;
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
    const ip = getRequestIP(ctx.event);
    const result = await unkey.limit(ip || 'unknown');
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
    // @ts-expect-error, we know this is a valid key
    acc[key] = trpcContext.procedure.use(
      createRatelimiter({ limit, duration, namespace: `public.${key}` })
    );
    return acc;
  },
  {} as Record<keyof typeof publicRateLimits, typeof publicProcedure>
);

export const accountProcedure = trpcContext.procedure.use(
  isAccountAuthenticated
);
export const orgProcedure = trpcContext.procedure.use(hasOrgShortcode);
export const eeProcedure = orgProcedure.use(isEeEnabled);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
