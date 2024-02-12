import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, publicProcedure, limitedProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
import { isFakeEmail } from 'fakefilter';
import { UAParser } from 'ua-parser-js';
import { blockedUsernames } from '~/server/utils/signup';
import { TRPCError } from '@trpc/server';
import { lucia } from '~/server/utils/auth';

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

async function validateEmailAddress(email: string): Promise<{
  validEmail: boolean;
}> {
  const fakeEmail = isFakeEmail(email);
  return {
    validEmail: !fakeEmail
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
      return await validateEmailAddress(input.email);
    }),

  registerUser: limitedProcedure
    .input(
      z.object({
        username: z.string().min(5).max(32),
        email: z.string().email()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      // we recheck the username availability and email validity to ensure bad actors don't bypass the check
      const { available: validName } = await validateUsername(
        ctx.db,
        input.username
      );
      const { validEmail } = await validateEmailAddress(input.email);
      if (!validName) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Username is not available to register'
        });
      }
      if (!validEmail) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Email is not valid'
        });
      }

      const newUserPublicId = nanoId();
      const insertUserResponse = await db.insert(users).values({
        publicId: newUserPublicId,
        username: input.username
      });
      if (!insertUserResponse.insertId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong, please retry'
        });
      }

      const userId = +insertUserResponse.insertId;
      await db.insert(accounts).values({
        userId: userId,
        recoveryEmail: input.email,
        recoveryEmailEnabled: true
      });

      const { device, os } = UAParser(await getHeader(ctx.event, 'User-Agent'));
      const userDevice =
        device.type === 'mobile' ? device.toString() : device.vendor;

      const userSession = await lucia.createSession(newUserPublicId, {
        user: {
          id: userId,
          username: input.username,
          publicId: newUserPublicId
        },
        device: userDevice || 'Unknown',
        os: os.name || 'Unknown'
      });
      const cookie = lucia.createSessionCookie(userSession.id);
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      return {
        success: true
      };
    })
});
