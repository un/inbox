import { z } from 'zod';
import { router, userProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { accounts, users } from '@u22n/database/schema';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { TRPCError } from '@trpc/server';
import { nanoIdToken } from '@u22n/utils';
import { Argon2id } from 'oslo/password';

export const twoFactorRouter = router({
  createTwoFactorSecret: userProcedure
    .input(z.object({}).strict())
    .mutation(async ({ ctx }) => {
      const { user, db } = ctx;
      const userId = user.id;

      const existingData = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          username: true
        },
        with: {
          account: {
            columns: {
              twoFactorSecret: true
            }
          }
        }
      });

      if (!existingData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (existingData.account.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Two Factor Authentication (2FA) is already set up for this account'
        });
      }
      const newSecret = crypto.getRandomValues(new Uint8Array(20));
      await db
        .update(accounts)
        .set({ twoFactorSecret: encodeHex(newSecret) })
        .where(eq(accounts.userId, userId));
      const uri = createTOTPKeyURI(
        'UnInbox.com',
        existingData.username,
        newSecret
      );
      return { uri };
    }),

  verifyTwoFactor: userProcedure
    .input(
      z
        .object({
          twoFactorCode: z.string()
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;
      const userId = user.id;
      const existingData = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          account: {
            columns: {
              twoFactorSecret: true,
              recoveryCode: true
            }
          }
        }
      });

      if (!existingData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!existingData.account.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Two Factor Authentication (2FA) is not set up for this account'
        });
      }
      if (existingData.account.recoveryCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Two Factor Authentication (2FA) has already been verified with this account, please disable then re-enable Two Factor Authentication (2FA) if you want to see your recovery codes again.'
        });
      }

      const secret = decodeHex(existingData.account.twoFactorSecret);
      const isValid = await new TOTPController().verify(
        input.twoFactorCode,
        secret
      );
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid Two Factor Authentication (2FA) code'
        });
      }

      // generate and return the recovery codes
      const recoveryCode = nanoIdToken();
      const hashedRecoveryCode = await new Argon2id().hash(recoveryCode);

      await db
        .update(accounts)
        .set({ recoveryCode: hashedRecoveryCode })
        .where(eq(accounts.userId, userId));

      return { recoveryCode: recoveryCode };
    }),
  disableTwoFactor: userProcedure
    .input(z.object({ twoFactorCode: z.string() }).strict())
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;
      const userId = user.id;

      const existingData = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          account: {
            columns: {
              twoFactorSecret: true,
              recoveryCode: true
            }
          }
        }
      });

      if (!existingData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!existingData.account.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not set up for this account'
        });
      }
      const secret = decodeHex(existingData.account.twoFactorSecret);
      const isValid = await new TOTPController().verify(
        input.twoFactorCode,
        secret
      );
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
        });
      }

      // No need to check if twoFactorSecret exists
      await db
        .update(accounts)
        .set({ twoFactorSecret: null, recoveryCode: null })
        .where(eq(accounts.userId, userId));
      return {};
    })
});
