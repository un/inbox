import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { router, publicRateLimitedProcedure } from '~platform/trpc/trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { strongPasswordSchema } from '@u22n/utils/password';
import { typeIdValidator } from '@u22n/utils/typeid';
import { ms } from '@u22n/utils/ms';
import { TRPCError } from '@trpc/server';
import { createLuciaSessionCookie } from '~platform/utils/session';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { env } from '~platform/env';
import { storage } from '~platform/storage';

export const recoveryRouter = router({
  /**
   * @deprecated use `getRecoveryVerificationToken` instead
   */
  recoverAccount: publicRateLimitedProcedure.recoverAccount
    .input(
      z.object({
        username: zodSchemas.username(2),
        password: z.string().min(8).optional(),
        twoFactorCode: z.string().min(6).max(6).optional(),
        recoveryCode: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, event } = ctx;

      const userResponse = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username),
        columns: {
          id: true,
          publicId: true,
          username: true,
          passwordHash: true,
          twoFactorSecret: true,
          twoFactorEnabled: true,
          recoveryCode: true
        }
      });

      if (!userResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Incorrect username or password'
        });
      }

      if (!input.password && !input.twoFactorCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Password or 2FA code required'
        });
      }

      let validPassword = false;
      if (input.password) {
        if (!userResponse.passwordHash) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: 'Password reset is not enabled for this account'
          });
        }

        validPassword = await new Argon2id().verify(
          userResponse.passwordHash,
          input.password
        );

        if (!validPassword) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Incorrect username or password'
          });
        }
      }

      let otpValid = false;
      if (input.twoFactorCode) {
        if (!userResponse.twoFactorEnabled || !userResponse.twoFactorSecret) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: '2FA is not enabled for this account'
          });
        }

        const secret = decodeHex(userResponse.twoFactorSecret!);
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

      if (!userResponse.recoveryCode) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Account recovery is not enabled'
        });
      }

      const isRecoveryCodeValid = await new Argon2id().verify(
        userResponse.recoveryCode,
        input.recoveryCode
      );

      if (isRecoveryCodeValid) {
        // Remove the used recovery code from the database
        await db
          .update(accounts)
          .set({
            recoveryCode: null
          })
          .where(eq(accounts.id, userResponse.id));
      } else {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid recovery code'
        });
      }

      if (
        (validPassword && isRecoveryCodeValid) ||
        (otpValid && isRecoveryCodeValid)
      ) {
        const { id: accountId, username, publicId } = userResponse;

        await createLuciaSessionCookie(event, {
          accountId,
          username,
          publicId
        });

        const authStorage = storage.auth;
        const token = nanoIdToken();
        authStorage.setItem(
          `authVerificationToken: ${userResponse.publicId}`,
          token
        );
        setCookie(event, 'authVerificationToken', token, {
          maxAge: 5 * 60,
          httpOnly: false,
          domain: env.PRIMARY_DOMAIN,
          sameSite: 'Lax'
        });

        return { success: true };
      }

      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message:
          'Something went wrong, you should never see this message. Please report to team immediately.'
      });
    }),
  getRecoveryVerificationToken: publicRateLimitedProcedure.recoverAccount
    .input(
      z
        .object({
          username: zodSchemas.username(2),
          recoveryCode: zodSchemas.nanoIdToken()
        })
        .and(
          z.union([
            z.object({ password: z.string().min(8) }),
            z.object({ twoFactorCode: z.string().min(6).max(6) })
          ])
        )
    )
    .query(async ({ input, ctx }) => {
      const { db } = ctx;

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username),
        columns: {
          id: true,
          publicId: true,
          username: true,
          passwordHash: true,
          twoFactorSecret: true,
          twoFactorEnabled: true,
          recoveryCode: true
        }
      });

      if (
        !account ||
        !account.recoveryCode ||
        !account.passwordHash ||
        !account.twoFactorSecret
      ) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message:
            'Either you provided a wrong username or recovery is not enabled for this account'
        });
      }

      const isRecoveryCodeValid = await new Argon2id().verify(
        account.recoveryCode,
        input.recoveryCode
      );

      if (!isRecoveryCodeValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid Credentials'
        });
      }

      let resetting: 'password' | '2fa' | null = null;

      if ('password' in input) {
        const validPassword = await new Argon2id().verify(
          account.passwordHash,
          input.password
        );

        if (!validPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid Credentials'
          });
        }

        resetting = '2fa';
      }

      if ('twoFactorCode' in input) {
        const secret = decodeHex(account.twoFactorSecret!);
        const otpValid = await new TOTPController().verify(
          input.twoFactorCode,
          secret
        );

        if (!otpValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid Credentials'
          });
        }
        resetting = 'password';
      }

      if (!resetting) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Password or 2FA code required'
        });
      }

      const resetToken = nanoIdToken();
      await storage.auth.setItem(
        `reset-token:${resetting}:${account.publicId}`,
        resetToken
      );
      setCookie(ctx.event, `reset-token_${resetting}`, resetToken, {
        maxAge: ms('5 minutes'),
        httpOnly: true,
        domain: env.PRIMARY_DOMAIN,
        sameSite: 'Lax',
        secure: env.NODE_ENV === 'production'
      });

      // If it is a 2FA reset, return the new URI too
      if (resetting === '2fa') {
        const newSecret = crypto.getRandomValues(new Uint8Array(20));
        const uri = createTOTPKeyURI('UnInbox.com', input.username, newSecret);
        const hexSecret = encodeHex(newSecret);
        await storage.auth.setItem(
          `2fa-reset-secret:${account.publicId}`,
          hexSecret
        );
        return { resetting, accountPublicId: account.publicId, uri };
      } else {
        return { resetting, accountPublicId: account.publicId };
      }
    }),
  resetPassword: publicRateLimitedProcedure.completeRecovery
    .input(
      z.object({
        accountPublicId: typeIdValidator('account'),
        newPassword: strongPasswordSchema
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { db, event } = ctx;

      const resetToken = getCookie(event, 'reset-token_password');
      const storedResetToken = await storage.auth.getItem<string>(
        `reset-token:password:${input.accountPublicId}`
      );

      if (!resetToken || !storedResetToken || resetToken !== storedResetToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid reset token'
        });
      }

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.publicId, input.accountPublicId),
        columns: {
          id: true
        }
      });

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found'
        });
      }

      const passwordHash = await new Argon2id().hash(input.newPassword);
      await db
        .update(accounts)
        .set({
          passwordHash,
          recoveryCode: null
        })
        .where(eq(accounts.id, account.id));

      await storage.auth.removeItem(
        `reset-token:password:${input.accountPublicId}`
      );

      deleteCookie(event, 'reset-token_password');

      return { success: true };
    }),
  resetTwoFactor: publicRateLimitedProcedure.completeRecovery
    .input(
      z.object({
        accountPublicId: typeIdValidator('account'),
        twoFactorCode: z.string().min(6).max(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { db, event } = ctx;

      const resetToken = getCookie(event, 'reset-token_2fa');
      const storedResetToken = await storage.auth.getItem<string>(
        `reset-token:2fa:${input.accountPublicId}`
      );

      if (!resetToken || !storedResetToken || resetToken !== storedResetToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid reset token'
        });
      }

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.publicId, input.accountPublicId),
        columns: {
          id: true
        }
      });

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found'
        });
      }

      const storedSecret = await storage.auth.getItem<string>(
        `2fa-reset-secret:${input.accountPublicId}`
      );
      if (!storedSecret) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '2FA Secret not found, please try again after some time'
        });
      }

      const secret = decodeHex(storedSecret);
      const isValid = await new TOTPController().verify(
        input.twoFactorCode,
        secret
      );
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '2FA code is not valid'
        });
      }

      await db
        .update(accounts)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: storedSecret,
          recoveryCode: null
        })
        .where(eq(accounts.id, account.id));

      await storage.auth.removeItem(
        `2fa-reset-secret:${input.accountPublicId}`
      );
      await storage.auth.removeItem(`reset-token:2fa:${input.accountPublicId}`);
      deleteCookie(event, 'reset-token_2fa');

      return { success: true };
    })
});
