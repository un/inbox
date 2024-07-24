import { z } from 'zod';
import { router, accountProcedure, publicProcedure } from '~platform/trpc/trpc';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { TRPCError } from '@trpc/server';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { deleteCookie, getCookie, setCookie } from '@u22n/hono/helpers';
import { storage } from '~platform/storage';
import { env } from '~platform/env';
import { createLuciaSessionCookie } from '~platform/utils/session';
import { ratelimiter } from '~platform/trpc/ratelimit';

export const twoFactorRouter = router({
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
