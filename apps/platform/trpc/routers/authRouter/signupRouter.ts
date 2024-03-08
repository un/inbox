import { z } from 'zod';
import { router, limitedProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';
import { blockedUsernames, reservedUsernames } from '../../../utils/signup';
import { zodSchemas } from '@uninbox/utils';

export async function validateUsername(
  db: DBType,
  username: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const registeredUser = await db.query.users.findFirst({
    where: eq(users.username, username)
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
        'This username is currently reserved. If you own this trademark, please Contact Support'
    };
  }
  return {
    available: true,
    error: null
  };
}

export const signupRouter = router({
  checkUsernameAvailability: limitedProcedure
    .input(
      z.object({
        username: zodSchemas.username()
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateUsername(ctx.db, input.username);
    })
});
