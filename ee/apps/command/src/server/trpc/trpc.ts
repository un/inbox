import { TRPCError, initTRPC } from '@trpc/server';
import { getAccount } from '@/lib/get-account';
import type { NextRequest } from 'next/server';
import type { db } from '@u22n/database';
import superjson from 'superjson';

export const trpcContext = initTRPC
  .context<{
    db: typeof db;
    account: { id: number; username: string } | null;
    event: NextRequest;
  }>()
  .create({ transformer: superjson });

const isAccountAuthenticated = trpcContext.middleware(async ({ next, ctx }) => {
  const account = await getAccount(ctx.event);

  if (!account?.id || !account.username) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in, redirecting...'
    });
  }

  return next({ ctx: { ...ctx, account } });
});

export const accountProcedure = trpcContext.procedure.use(
  isAccountAuthenticated
);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
