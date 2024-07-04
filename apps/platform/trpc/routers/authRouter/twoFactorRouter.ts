import { z } from 'zod';
import { router, accountProcedure, publicProcedure } from '~platform/trpc/trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { TRPCError } from '@trpc/server';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { Argon2id } from 'oslo/password';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { storage } from '~platform/storage';
import { env } from '~platform/env';
import { createLuciaSessionCookie } from '~platform/utils/session';
import { ratelimiter } from '~platform/trpc/ratelimit';

export const twoFactorRouter = router({
  /**
   * @deprecated remove with Nuxt Webapp
   */
  createTwoFactorSecret: accountProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const { account, db } = ctx;
      const accountId = account.id;

      const existingData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          username: true,
          twoFactorSecret: true,
          twoFactorEnabled: true
        }
      });

      if (!existingData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (existingData.twoFactorEnabled) {
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
        .where(eq(accounts.id, accountId));
      const uri = createTOTPKeyURI(
        'UnInbox.com',
        existingData.username,
        newSecret
      );
      return { uri };
    }),

  /**
   * @deprecated remove with Nuxt Webapp
   */
  verifyTwoFactor: accountProcedure
    .input(
      z.object({
        twoFactorCode: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { account, db } = ctx;
      const accountId = account.id;

      const existingData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          twoFactorSecret: true,
          recoveryCode: true,
          twoFactorEnabled: true
        }
      });

      if (!existingData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!existingData.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Two Factor Authentication (2FA) is not set up for this account'
        });
      }

      if (existingData.recoveryCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Two Factor Authentication (2FA) has already been verified with this account, please disable then re-enable Two Factor Authentication (2FA) if you want to see your recovery codes again.'
        });
      }

      const secret = decodeHex(existingData.twoFactorSecret);
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
        .set({ recoveryCode: hashedRecoveryCode, twoFactorEnabled: true })
        .where(eq(accounts.id, accountId));

      return { recoveryCode: recoveryCode };
    }),

  /**
   * @deprecated remove with Nuxt Webapp
   */
  disableTwoFactor: accountProcedure
    .input(z.object({ twoFactorCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { account, db } = ctx;
      const accountId = account.id;

      const existingData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          twoFactorSecret: true,
          recoveryCode: true
        }
      });

      if (!existingData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!existingData.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not set up for this account'
        });
      }
      const secret = decodeHex(existingData.twoFactorSecret);
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
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          recoveryCode: null
        })
        .where(eq(accounts.id, accountId));
      return {};
    }),

  createTwoFactorChallenge: publicProcedure
    .use(ratelimiter({ limit: 10, namespace: 'signUp.twoFactor.generate' }))
    .input(z.object({ username: zodSchemas.username() }))
    .query(async ({ ctx, input }) => {
      const authStorage = storage.auth;
      const existingChallenge = getCookie(ctx.event, 'un-2fa-challenge');

      if (existingChallenge) {
        const existingSecret = await authStorage.getItem(
          `un2faChallenge:${input.username}-${existingChallenge}`
        );
        if (typeof existingSecret === 'string') {
          return {
            uri: createTOTPKeyURI(
              'UnInbox.com',
              input.username,
              decodeHex(existingSecret)
            )
          };
        }
      }

      const newSecret = crypto.getRandomValues(new Uint8Array(20));
      const uri = createTOTPKeyURI('UnInbox.com', input.username, newSecret);
      const hexSecret = encodeHex(newSecret);
      const challengeId = nanoIdToken();
      await authStorage.setItem(
        `un2faChallenge:${input.username}-${challengeId}`,
        hexSecret
      );
      setCookie(ctx.event, 'un-2fa-challenge', challengeId, {
        domain: env.PRIMARY_DOMAIN,
        httpOnly: true
      });
      return { uri };
    }),
  verifyTwoFactorChallenge: publicProcedure
    .use(ratelimiter({ limit: 20, namespace: 'signIn.twoFactor.verify' }))
    .input(
      z.object({
        twoFactorCode: z.string().min(6).max(6)
      })
    )
    .mutation(async ({ ctx, input }) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const challengeCookie = getCookie(
        ctx.event,
        'two-factor-login-challenge'
      );

      if (!challengeCookie) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Two Factor Challenge not found or timed out'
        });
      }

      const challenge =
        await storage.twoFactorLoginChallenges.getItem(challengeCookie);

      if (!challenge) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Two Factor Challenge not found or timed out'
        });
      }

      const secret = decodeHex(challenge.secret);
      const isValid = await new TOTPController().verify(
        input.twoFactorCode,
        secret
      );

      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid Two Factor Authentication code'
        });
      }

      deleteCookie(ctx.event, 'two-factor-login-challenge');
      await storage.twoFactorLoginChallenges.removeItem(challengeCookie);

      await createLuciaSessionCookie(ctx.event, {
        accountId: challenge.account.id,
        publicId: challenge.account.publicId,
        username: challenge.account.username
      });

      return {
        defaultOrgSlug: challenge.defaultOrgSlug
      };
    })
});
