import { z } from 'zod';
import { router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { TRPCError } from '@trpc/server';
import { nanoIdToken } from '@uninbox/utils';
import { Argon2id } from 'oslo/password';

export const totpRouter = router({
  createTotpSecret: userProcedure
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
              totpSecret: true
            }
          }
        }
      });
      if (existingData.account.totpSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is already set up for this account'
        });
      }
      const newSecret = crypto.getRandomValues(new Uint8Array(20));
      await db
        .update(accounts)
        .set({ totpSecret: encodeHex(newSecret) })
        .where(eq(accounts.userId, userId));
      const uri = createTOTPKeyURI('UnInbox', existingData.username, newSecret);
      return { uri };
    }),

  verifyTotp: userProcedure
    .input(
      z
        .object({
          otp: z.string()
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
              totpSecret: true
            }
          }
        }
      });
      if (!existingData.account.totpSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not set up for this account'
        });
      }
      const secret = decodeHex(existingData.account.totpSecret);
      const isValid = await new TOTPController().verify(input.otp, secret);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
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
  disableTotp: userProcedure
    .input(z.object({}).strict())
    .mutation(async ({ ctx }) => {
      const { user, db } = ctx;
      const userId = user.id;
      // No need to check if totpSecret exists
      await db
        .update(accounts)
        .set({ totpSecret: null })
        .where(eq(accounts.userId, userId));
      return {};
    })
});
