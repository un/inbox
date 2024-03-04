import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { limitedProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { zodSchemas } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';
import { UAParser } from 'ua-parser-js';
import { createError, getHeader, setCookie } from '#imports';
import { lucia } from '../../../utils/auth';

export const passwordRouter = router({
  setUserPassword: userProcedure
    .input(
      z
        .object({
          password: z
            .string()
            .min(8, { message: 'Minimum 8 characters' })
            .max(64)
            .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/, {
              message:
                'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
            }),
          invalidateAllSessions: z.boolean().default(false)
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      const userData = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          publicId: true,
          username: true,
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

      if (!userData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      // Check if password or passkey is not set and timeTillOrphaned is passed
      if (
        !(
          userData.account.passwordHash ||
          userData.account.authenticators.length > 0
        ) &&
        new Date().getTime() >=
          userData.createdAt.getTime() + useRuntimeConfig().timeTillOrphanedUser
      ) {
        // remove orphaned user before returning
        await db.delete(users).where(eq(users.id, userData.id));

        throw new TRPCError({
          code: 'NOT_FOUND',
          message:
            'Your account has been deleted due to not setting a password or passkey in required time, You can still create a new account with the same username if it has not been claimed'
        });
      }

      const hashedPassword = await new Argon2id().hash(input.password);

      await db
        .update(accounts)
        .set({
          passwordHash: hashedPassword
        })
        .where(eq(accounts.userId, userId));

      // Invalidate all sessions
      if (input.invalidateAllSessions) {
        await lucia.invalidateUserSessions(user.session.userId);
      }

      // Set session for current device
      const { device, os } = UAParser(getHeader(ctx.event, 'User-Agent'));
      const userDevice =
        device.type === 'mobile' ? device.toString() : device.vendor;

      const userSession = await lucia.createSession(userData.publicId, {
        user: {
          id: userData.id,
          username: userData.username,
          publicId: userData.publicId
        },
        device: userDevice || 'Unknown',
        os: os.name || 'Unknown'
      });
      const cookie = lucia.createSessionCookie(userSession.id);
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);
      return { success: true };
    }),

  passwordSignIn: limitedProcedure
    .input(
      z
        .object({
          turnstileToken: z.string(),
          username: zodSchemas.username(2),
          password: z
            .string()
            .min(8, { message: 'Minimum 8 characters' })
            .max(64)
            .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/, {
              message:
                'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
            })
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const { username, password } = input;

      const userResponse = await db.query.users.findFirst({
        where: eq(users.username, username),
        columns: {
          id: true,
          publicId: true,
          username: true
        },
        with: {
          account: {
            columns: {
              id: true,
              passwordHash: true
            }
          }
        }
      });

      if (!userResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!userResponse.account.passwordHash) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Password sign-in is not enabled'
        });
      }

      const validPassword = await new Argon2id().verify(
        userResponse.account.passwordHash,
        password
      );
      if (!validPassword) {
        throw createError({
          message: 'Incorrect username or password',
          statusCode: 400
        });
      }

      const { device, os } = UAParser(getHeader(ctx.event, 'User-Agent'));
      const userDevice =
        device.type === 'mobile' ? device.toString() : device.vendor;

      const userSession = await lucia.createSession(userResponse.publicId, {
        user: {
          id: userResponse.id,
          username: userResponse.username,
          publicId: userResponse.publicId
        },
        device: userDevice || 'Unknown',
        os: os.name || 'Unknown'
      });
      const cookie = lucia.createSessionCookie(userSession.id);
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userResponse.id));

      return { success: true };
    })
});
