import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { limitedProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { nanoId, zodSchemas } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';
import { createError, setCookie } from '#imports';
import { lucia } from '../../../utils/auth';
import { validateUsername } from './signupRouter';
import { createLuciaSessionCookie } from '../../../utils/session';

export const passwordRouter = router({
  signUpWithPassword: limitedProcedure
    .input(
      z.object({
        username: zodSchemas.username(),
        password: zodSchemas.password()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { username, password } = input;
      const { db } = ctx;

      // making sure someone doesn't bypass the client side validation
      const { available, error } = await validateUsername(db, username);
      if (!available) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error
        });
      }

      const passwordHash = await new Argon2id().hash(password);
      const publicId = nanoId();

      const userId = await db
        .transaction(async (tx) => {
          const newUser = await tx.insert(users).values({
            username,
            publicId
          });
          await tx.insert(accounts).values({
            userId: Number(newUser.insertId),
            passwordHash
          });
          return Number(newUser.insertId);
        })
        .catch((err) => {
          console.error(err);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error creating user'
          });
        });

      const cookie = await createLuciaSessionCookie(ctx.event, {
        userId,
        username,
        publicId
      });
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));

      return { success: true };
    }),

  signInWithPassword: limitedProcedure
    .input(
      z.object({
        turnstileToken: z.string(),
        // we allow min length of 2 for username if we plan to provide them in the future
        username: zodSchemas.username(2),
        password: zodSchemas.password()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const userResponse = await db.query.users.findFirst({
        where: eq(users.username, input.username),
        columns: {
          id: true,
          publicId: true,
          username: true
        },
        with: {
          account: {
            columns: {
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
        input.password
      );
      if (!validPassword) {
        throw createError({
          message: 'Incorrect username or password',
          statusCode: 400
        });
      }

      const { id: userId, username, publicId } = userResponse;
      const cookie = await createLuciaSessionCookie(ctx.event, {
        userId,
        username,
        publicId
      });
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userResponse.id));

      return { success: true };
    }),

  updateUserPassword: userProcedure
    .input(
      z
        .object({
          oldPassword: zodSchemas.password(),
          newPassword: zodSchemas.password(),
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
          publicId: true,
          username: true
        },
        with: {
          account: {
            columns: {
              passwordHash: true
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

      const oldPasswordValid = await new Argon2id().verify(
        userData.account.passwordHash,
        input.oldPassword
      );

      if (!oldPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect old password'
        });
      }

      const passwordHash = await new Argon2id().hash(input.newPassword);

      await db
        .update(accounts)
        .set({
          passwordHash
        })
        .where(eq(accounts.userId, userId));

      // Invalidate all sessions
      if (input.invalidateAllSessions) {
        await lucia.invalidateUserSessions(user.session.userId);
      }

      const cookie = await createLuciaSessionCookie(ctx.event, {
        userId,
        username: userData.username,
        publicId: userData.publicId
      });

      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);
      return { success: true };
    })
});
