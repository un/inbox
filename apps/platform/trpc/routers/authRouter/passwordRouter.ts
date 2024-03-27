import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { limitedProcedure, router, accountProcedure } from '~/trpc/trpc';
import { eq } from '@u22n/database/orm';
import { accountCredentials, accounts } from '@u22n/database/schema';
import { strongPasswordSchema, typeIdGenerator, zodSchemas } from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import { createError, setCookie } from 'h3';
import { lucia } from '~/utils/auth';
import { validateUsername } from './signupRouter';
import { createLuciaSessionCookie } from '~/utils/session';
import { decodeHex } from 'oslo/encoding';
import { TOTPController } from 'oslo/otp';

export const passwordRouter = router({
  signUpWithPassword: limitedProcedure
    .input(
      z.object({
        username: zodSchemas.username(),
        password: strongPasswordSchema
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
          message: error || 'Username is not available'
        });
      }

      const passwordHash = await new Argon2id().hash(password);
      const publicId = typeIdGenerator('account');

      const accountId = await db
        .transaction(async (tx) => {
          const newUser = await tx.insert(accounts).values({
            username,
            publicId
          });
          await tx.insert(accountCredentials).values({
            accountId: Number(newUser.insertId),
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
        accountId,
        username,
        publicId
      });
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      await db
        .update(accounts)
        .set({ lastLoginAt: new Date() })
        .where(eq(accounts.id, accountId));

      return { success: true };
    }),

  signInWithPassword: limitedProcedure
    .input(
      z.object({
        turnstileToken: z.string(),
        // we allow min length of 2 for username if we plan to provide them in the future
        username: zodSchemas.username(2),
        password: strongPasswordSchema.optional(),
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

      const userResponse = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username),
        columns: {
          id: true,
          publicId: true,
          username: true
        },
        with: {
          accountCredential: {
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
      let validPassword = false;
      if (input.password) {
        if (!userResponse.accountCredential.passwordHash) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: 'Password sign-in is not enabled'
          });
        }

        validPassword = await new Argon2id().verify(
          userResponse.accountCredential.passwordHash,
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
      let otpValid = false;
      if (input.twoFactorCode) {
        if (!userResponse.accountCredential.twoFactorSecret) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: '2FA sign-in is not enabled'
          });
        }
        const secret = decodeHex(
          userResponse.accountCredential.twoFactorSecret
        );
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
      let recoveryCodeValid = false;

      if (input.recoveryCode) {
        if (!userResponse.accountCredential.recoveryCode) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: 'Recovery code sign-in is not enabled'
          });
        }

        const isRecoveryCodeValid = await new Argon2id().verify(
          userResponse.accountCredential.recoveryCode,
          input.recoveryCode
        );
        if (isRecoveryCodeValid) {
          // Remove the used recovery code from the database
          await db
            .update(accountCredentials)
            .set({
              recoveryCode: null
            })
            .where(eq(accountCredentials.accountId, userResponse.id));
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
        const { id: accountId, username, publicId } = userResponse;

        const cookie = await createLuciaSessionCookie(ctx.event, {
          accountId,
          username,
          publicId
        });
        setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

        await db
          .update(accounts)
          .set({ lastLoginAt: new Date() })
          .where(eq(accounts.id, userResponse.id));

        return { success: true };
      }
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Something went wrong, please contact support'
      });
    }),

  updateUserPassword: accountProcedure
    .input(
      z
        .object({
          oldPassword: strongPasswordSchema,
          newPassword: strongPasswordSchema,
          otp: zodSchemas.nanoIdToken(),
          invalidateAllSessions: z.boolean().default(false)
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true
        },
        with: {
          accountCredential: {
            columns: {
              passwordHash: true,
              twoFactorSecret: true
            }
          }
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!accountData.accountCredential.passwordHash) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Password sign-in is not enabled'
        });
      }

      const oldPasswordValid = await new Argon2id().verify(
        accountData.accountCredential.passwordHash,
        input.oldPassword
      );

      if (!oldPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect old password'
        });
      }

      if (!accountData.accountCredential.twoFactorSecret) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: '2FA is not enabled on this account, contact support'
        });
      }
      const secret = decodeHex(accountData.accountCredential.twoFactorSecret);
      const otpValid = await new TOTPController().verify(input.otp, secret);
      if (!otpValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
        });
      }

      const passwordHash = await new Argon2id().hash(input.newPassword);

      await db
        .update(accountCredentials)
        .set({
          passwordHash
        })
        .where(eq(accountCredentials.accountId, accountId));

      // Invalidate all sessions if requested
      if (input.invalidateAllSessions) {
        await lucia.invalidateUserSessions(accountId);
      }

      const cookie = await createLuciaSessionCookie(ctx.event, {
        accountId,
        username: accountData.username,
        publicId: accountData.publicId
      });

      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);
      return { success: true };
    })
});
