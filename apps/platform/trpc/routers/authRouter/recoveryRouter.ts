import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { publicProcedure, router } from '~platform/trpc/trpc';
import { strongPasswordSchema } from '@u22n/utils/password';
import { ratelimiter } from '~platform/trpc/ratelimit';
import { accounts } from '@u22n/database/schema';
import { storage } from '~platform/storage';
import { Argon2id } from 'oslo/password';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { z } from 'zod';

export const recoveryRouter = router({
  verifyRecoveryCode: publicProcedure
    .use(ratelimiter({ limit: 10, namespace: 'recovery.verify' }))
    .input(
      z.object({
        code: z.string().length(6),
        username: zodSchemas.usernameLogin(2)
      })
    )
    .mutation(async ({ input }) => {
      const storedData = await storage.accountRecoveryVerificationCodes.getItem(
        input.code
      );

      if (!storedData || storedData.account.username !== input.username) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired verification code'
        });
      }

      // Generate a reset token
      const resetToken = nanoIdToken();
      await storage.resetTokens.setItem(resetToken, storedData);

      // Remove the used verification code
      await storage.accountRecoveryVerificationCodes.removeItem(input.code);

      return { success: true, token: resetToken };
    }),
  resetPassword: publicProcedure
    .use(ratelimiter({ limit: 20, namespace: 'recovery.finish.password' }))
    .input(
      z.object({
        token: z.string(),
        newPassword: strongPasswordSchema
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const storedData = await storage.resetTokens.getItem(input.token);
      if (!storedData) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired reset token'
        });
      }
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.publicId, storedData.account.publicId),
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

      await storage.resetTokens.removeItem(input.token);

      return { success: true };
    })
});
