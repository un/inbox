import { z } from 'zod';
import { router, publicRateLimitedProcedure } from '~platform/trpc/trpc';
import type { DBType } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { blockedUsernames, reservedUsernames } from '~platform/utils/signup';
import { zodSchemas, calculatePasswordStrength } from '@u22n/utils';

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
  checkUsernameAvailability:
    publicRateLimitedProcedure.checkUsernameAvailability
      .input(
        z.object({
          username: zodSchemas.username()
        })
      )
      .query(async ({ ctx, input }) => {
        return await validateUsername(ctx.db, input.username);
      }),
  checkPasswordStrength: publicRateLimitedProcedure.checkPasswordStrength
    .input(
      z.object({
        password: z.string()
      })
    )
    .query(({ input }) => calculatePasswordStrength(input.password))
});
