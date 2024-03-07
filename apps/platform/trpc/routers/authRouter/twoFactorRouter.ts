import { z } from 'zod';
import { router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { TRPCError } from '@trpc/server';
import { nanoIdToken } from '@uninbox/utils';
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
              recoveryCodes: true
            }
          }
        }
      });
      if (!existingData.account.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Two Factor Authentication (2FA) is not set up for this account'
        });
      }
      if (existingData.account.recoveryCodes?.length > 0) {
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
      const recoveryCodes = Array.from({ length: 10 }, () => nanoIdToken());
      const hashedRecoveryCodes = await Promise.all(
        recoveryCodes.map(async (code) => {
          return await new Argon2id().hash(code);
        })
      );
      await db
        .update(accounts)
        .set({ recoveryCodes: hashedRecoveryCodes })
        .where(eq(accounts.userId, userId));

      return { recoveryCodes: recoveryCodes };
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
              recoveryCodes: true
            }
          }
        }
      });
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
        .set({ twoFactorSecret: null, recoveryCodes: [] })
        .where(eq(accounts.userId, userId));
      return {};
    })
});
