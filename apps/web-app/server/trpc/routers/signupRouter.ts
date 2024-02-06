import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, publicProcedure, limitedProcedure } from '../trpc';
import type { DBType } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
import { isFakeEmail } from 'fakefilter';
import { blockedUsernames } from '~/server/utils/signup';

async function validateUsername(
  db: DBType,
  username: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const userId = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));
  if (userId.length !== 0) {
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
  return {
    available: true,
    error: null
  };
}

export const signupRouter = router({
  checkUsernameAvailability: limitedProcedure
    .input(
      z.object({
        username: z.string().min(5).max(32)
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateUsername(ctx.db, input.username);
    }),

  validateEmailAddress: limitedProcedure
    .input(
      z.object({
        email: z.string().email()
      })
    )
    .query(async ({ ctx, input }) => {
      const fakeEmail = isFakeEmail(input.email);
      return { validEmail: fakeEmail === false ? true : false };
    }),

  registerUser: limitedProcedure
    .input(
      z.object({
        username: z.string().min(5).max(32),
        email: z.string().email()
      })
    )
    .mutation(async ({ ctx, input }) => {
      //! refactor

      const db = ctx.db;
      const { available: validName } = await validateUsername(
        ctx.db,
        input.username
      );
      if (!validName) {
        return {
          success: false,
          username: input.username,
          userPublicId: null,
          error: 'Username is not available to register'
        };
      }

      const newPublicId = nanoId();
      const insertUserResponse = await db.insert(users).values({
        publicId: newPublicId,
        username: input.username
      });

      //! add user Auth recovery email into auth table

      if (!insertUserResponse.insertId) {
        console.log(insertUserResponse);
        return {
          success: false,
          username: input.username,
          userPublicId: null,
          error:
            'Something went wrong, please retry. Contact our team if it persists'
        };
      }
      return {
        success: true,
        username: input.username,
        userPublicId: newPublicId,
        error: null
      };
    })
});
