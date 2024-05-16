import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import { router, publicRateLimitedProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { nanoIdToken, zodSchemas } from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import { createLuciaSessionCookie } from '../../../utils/session';
import { decodeHex } from 'oslo/encoding';
import { TOTPController } from 'oslo/otp';
import { setCookie } from 'hono/cookie';
import { env } from '../../../env';
import { storage } from '../../../storage';

export const recoveryRouter = router({
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

        const cookie = await createLuciaSessionCookie(event, {
          accountId,
          username,
          publicId
        });

        setCookie(event, cookie.name, cookie.value, cookie.attributes);

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

        await db
          .update(accounts)
          .set({ lastLoginAt: new Date() })
          .where(eq(accounts.id, userResponse.id));

        return { success: true };
      }

      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message:
          'Something went wrong, you should never see this message. Please report to team immediately.'
      });
    })
});
