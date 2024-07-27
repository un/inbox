import {
  router,
  turnstileProcedure,
  publicProcedure
} from '~platform/trpc/trpc';
import { COOKIE_TWO_FACTOR_LOGIN_CHALLENGE } from '~platform/utils/cookieNames';
import { createLuciaSessionCookie } from '~platform/utils/session';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { strongPasswordSchema } from '@u22n/utils/password';
import { ratelimiter } from '~platform/trpc/ratelimit';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { validateUsername } from './signupRouter';
import { accounts } from '@u22n/database/schema';
import { setCookie } from '@u22n/hono/helpers';
import { storage } from '~platform/storage';
import { datePlus } from '@u22n/utils/ms';
import { Argon2id } from 'oslo/password';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { env } from '~platform/env';
import { z } from 'zod';

export const passwordRouter = router({
  signUpWithPassword: publicProcedure
    .unstable_concat(turnstileProcedure)
    .use(ratelimiter({ limit: 10, namespace: 'signUp.password' }))
    .input(
      z.object({
        username: zodSchemas.username(),
        password: strongPasswordSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { password, username } = input;
      const { db, event } = ctx;

      const { accountId, publicId } = await db.transaction(async (tx) => {
        const { available, error } = await validateUsername(tx, username);
        if (!available) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Username Error : ${error}`
          });
        }
        const passwordHash = await new Argon2id().hash(password);
        const publicId = typeIdGenerator('account');

        const newUser = await tx.insert(accounts).values({
          username,
          publicId,
          passwordHash
        });

        return {
          accountId: Number(newUser.insertId),
          publicId
        };
      });

      await createLuciaSessionCookie(event, {
        accountId,
        username,
        publicId
      });

      return { success: true };
    }),

  signIn: publicProcedure
    .unstable_concat(turnstileProcedure)
    .use(ratelimiter({ limit: 20, namespace: 'signIn.password' }))
    .input(
      z.object({
        username: zodSchemas.usernameLogin(2),
        password: z.string().min(8)
      })
    )
    .output(
      z.object({
        status: z.enum(['NO_2FA_SETUP', '2FA_REQUIRED']),
        defaultOrgShortcode: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const userResponse = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username),
        columns: {
          id: true,
          publicId: true,
          username: true,
          passwordHash: true,
          twoFactorSecret: true,
          twoFactorEnabled: true
        },
        with: {
          orgMemberships: {
            with: {
              org: {
                columns: {
                  shortcode: true,
                  id: true
                }
              }
            }
          }
        }
      });

      if (!userResponse) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect username or password'
        });
      }

      if (!userResponse.passwordHash) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Password sign-in is not enabled'
        });
      }

      const validPassword = await new Argon2id().verify(
        userResponse.passwordHash,
        input.password
      );

      if (!validPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect username or password'
        });
      }

      if (userResponse.twoFactorEnabled && userResponse.twoFactorSecret) {
        const twoFactorChallengeId = nanoIdToken();

        await storage.twoFactorLoginChallenges.setItem(twoFactorChallengeId, {
          account: userResponse,
          defaultOrgSlug: userResponse.orgMemberships[0]?.org.shortcode,
          secret: userResponse.twoFactorSecret
        });

        setCookie(
          ctx.event,
          COOKIE_TWO_FACTOR_LOGIN_CHALLENGE,
          twoFactorChallengeId,
          {
            expires: datePlus('5 minutes'),
            domain: env.PRIMARY_DOMAIN,
            httpOnly: true
          }
        );
        return {
          status: '2FA_REQUIRED',
          defaultOrgShortcode: userResponse.orgMemberships[0]?.org.shortcode
        };
      } else {
        await createLuciaSessionCookie(ctx.event, {
          accountId: userResponse.id,
          username: userResponse.username,
          publicId: userResponse.publicId
        });
        return {
          status: 'NO_2FA_SETUP',
          defaultOrgShortcode: userResponse.orgMemberships[0]?.org.shortcode
        };
      }
    })
});
