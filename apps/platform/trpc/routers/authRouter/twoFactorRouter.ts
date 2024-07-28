import { COOKIE_TWO_FACTOR_LOGIN_CHALLENGE } from '~platform/utils/cookieNames';
import { createLuciaSessionCookie } from '~platform/utils/session';
import { router, publicProcedure } from '~platform/trpc/trpc';
import { deleteCookie, getCookie } from '@u22n/hono/helpers';
import { ratelimiter } from '~platform/trpc/ratelimit';
import { storage } from '~platform/storage';
import { decodeHex } from 'oslo/encoding';
import { TOTPController } from 'oslo/otp';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const twoFactorRouter = router({
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
        COOKIE_TWO_FACTOR_LOGIN_CHALLENGE
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

      deleteCookie(ctx.event, COOKIE_TWO_FACTOR_LOGIN_CHALLENGE);
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
