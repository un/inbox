import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { limitedProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { accounts, users } from '@u22n/database/schema';
import { nanoId, zodSchemas } from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import { createError, setCookie } from '#imports';
import { lucia } from '../../../utils/auth';
import { validateUsername } from './signupRouter';
import { createLuciaSessionCookie } from '../../../utils/session';
import { decodeHex } from 'oslo/encoding';
import { TOTPController } from 'oslo/otp';

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
        password: zodSchemas.password().optional(),
        twoFactorCode: zodSchemas.nanoIdToken(),
        recoveryCode: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      if (
        !(input.password && input.twoFactorCode) &&
        !(input.password && input.recoveryCode) &&
        !(input.twoFactorCode && input.recoveryCode)
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'You need to provide 2 of the following: Password, 2FA Code, Recovery Code'
        });
      }

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
              passwordHash: true,
              twoFactorSecret: true,
              recoveryCode: true
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

      // verify password if provided
      let validPassword: null | boolean;
      if (input.password) {
        if (!userResponse.account.passwordHash) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: 'Password sign-in is not enabled'
          });
        }

        validPassword = await new Argon2id().verify(
          userResponse.account.passwordHash,
          input.password
        );
        if (!validPassword) {
          throw createError({
            message: 'Incorrect username or password',
            statusCode: 400
          });
        }
      }

      // verify otp if provided
      let otpValid: null | boolean;
      if (input.twoFactorCode) {
        if (!userResponse.account.twoFactorSecret) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: '2FA sign-in is not enabled'
          });
        }
        const secret = decodeHex(userResponse.account.twoFactorSecret);
        otpValid = await new TOTPController().verify(
          input.twoFactorCode,
          secret
        );
        if (!otpValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid 2FA code'
          });
        }
      }

      // verify recovery code if provided
      let recoveryCodeValid: null | boolean;
      if (input.recoveryCode) {
        if (!userResponse.account.recoveryCode) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: 'Recovery code sign-in is not enabled'
          });
        }

        const isRecoveryCodeValid = await new Argon2id().verify(
          userResponse.account.recoveryCode,
          input.recoveryCode
        );
        if (isRecoveryCodeValid) {
          // Remove the used recovery code from the database
          await db
            .update(accounts)
            .set({
              recoveryCode: null
            })
            .where(eq(accounts.userId, userResponse.id));
          recoveryCodeValid = isRecoveryCodeValid;
        }

        if (!recoveryCodeValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid recovery code'
          });
        }
      }

      if (
        (validPassword && otpValid) ||
        (validPassword && recoveryCodeValid) ||
        (otpValid && recoveryCodeValid)
      ) {
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
      }
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Something went wrong, please contact support'
      });
    }),

  updateUserPassword: userProcedure
    .input(
      z
        .object({
          oldPassword: zodSchemas.password(),
          newPassword: zodSchemas.password(),
          otp: zodSchemas.nanoIdToken(),
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
              passwordHash: true,
              twoFactorSecret: true
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

      if (!userData.account.twoFactorSecret) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: '2FA is not enabled on this account, contact support'
        });
      }
      const secret = decodeHex(userData.account.twoFactorSecret);
      const otpValid = await new TOTPController().verify(input.otp, secret);
      if (!otpValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
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
