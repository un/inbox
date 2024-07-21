import { blockedUsernames, reservedUsernames } from '~platform/utils/signup';
import { calculatePasswordStrength } from '@u22n/utils/password';
import { router, publicProcedure } from '~platform/trpc/trpc';
import { ratelimiter } from '~platform/trpc/ratelimit';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { accounts } from '@u22n/database/schema';
import type { DBType } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { z } from 'zod';

export async function validateUsername(
  db: DBType,
  username: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const registeredUser = await db.query.accounts.findFirst({
    where: eq(accounts.username, username)
  });

  if (registeredUser) {
    return {
      available: false,
      error: 'Already taken'
    };
  }
  if (blockedUsernames.includes(username.toLowerCase())) {
    return {
      available: false,
      error: 'Username not allowed'
    };
  }
  if (reservedUsernames.includes(username.toLowerCase())) {
    return {
      available: false,
      error:
        'This username is reserved. If you own this trademark, please contact support'
    };
  }
  return {
    available: true,
    error: null
  };
}

export const signupRouter = router({
  checkUsernameAvailability: publicProcedure
    .use(ratelimiter({ limit: 30, namespace: 'check.username' }))
    .input(
      z.object({
        username: zodSchemas.username()
      })
    )
    .query(({ ctx, input }) => validateUsername(ctx.db, input.username)),
  checkPasswordStrength: publicProcedure
    .use(ratelimiter({ limit: 50, namespace: 'check.password' }))
    .input(
      z.object({
        password: z.string()
      })
    )
    .query(({ input }) => calculatePasswordStrength(input.password))
});
