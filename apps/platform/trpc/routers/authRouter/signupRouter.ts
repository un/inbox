import { z } from 'zod';
import { router, limitedProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
import { UAParser } from 'ua-parser-js';
import { blockedUsernames, reservedUsernames } from '../../../utils/signup';
import { TRPCError } from '@trpc/server';
import { lucia } from '../../../utils/auth';
import { zodSchemas } from '@uninbox/utils';
import { getHeader, setCookie, useRuntimeConfig } from '#imports';

async function validateUsername(
  db: DBType,
  username: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  // Find user by username with constrains
  // If username is already taken but there is no password or passkey set, then it's available if the time since created is more than 30 minutes
  //! TODO: We also need a corn job that will delete these users from time to time

  const registeredUser = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: {
      id: true,
      createdAt: true
    },
    with: {
      account: {
        columns: {
          passwordHash: true
        },
        with: {
          authenticators: {
            columns: {
              nickname: true
            }
          }
        }
      }
    }
  });

  if (registeredUser) {
    if (
      registeredUser.account.passwordHash ||
      registeredUser.account.authenticators.length > 0
    ) {
      return {
        available: false,
        error: 'Already taken'
      };
    }

    // If orphaned user, then it's available if the time since created is more than 30 minutes
    if (
      new Date().getTime() >=
      registeredUser.createdAt.getTime() +
        useRuntimeConfig().timeTillOrphanedUser
    ) {
      // remove orphaned user before returning
      await db.delete(users).where(eq(users.id, registeredUser.id));

      return {
        available: true,
        error: null
      };
    }
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
    }),

  registerUser: limitedProcedure
    .input(
      z.object({
        username: zodSchemas.username()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      // we recheck the username availability and email validity to ensure bad actors don't bypass the check
      const { available: validName } = await validateUsername(
        ctx.db,
        input.username
      );

      if (!validName) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Username is not available to register'
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
        userId
      });

      const { device, os } = UAParser(getHeader(ctx.event, 'User-Agent'));
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
      // Set cookie expiry to 30 min, so that user have to add password/passkey to continue
      cookie.attributes.expires = new Date(
        Date.now() + useRuntimeConfig().timeTillOrphanedUser
      );
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));

      return {};
    })
});
