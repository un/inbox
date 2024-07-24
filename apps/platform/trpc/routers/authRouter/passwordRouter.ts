import { z } from 'zod';
import { Argon2id } from 'oslo/password';
import {
  router,
  accountProcedure,
  turnstileProcedure,
  publicProcedure
} from '~platform/trpc/trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { strongPasswordSchema } from '@u22n/utils/password';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { TRPCError } from '@trpc/server';
import { lucia } from '~platform/utils/auth';
import { validateUsername } from './signupRouter';
import { createLuciaSessionCookie } from '~platform/utils/session';
import { decodeHex } from 'oslo/encoding';
import { TOTPController } from 'oslo/otp';
import { setCookie, getCookie, deleteCookie } from '@u22n/hono/helpers';
import { env } from '~platform/env';
import { storage } from '~platform/storage';
import { ms } from '@u22n/utils/ms';
import { ratelimiter } from '~platform/trpc/ratelimit';

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
  signUpWithPassword2FA: publicProcedure
    .unstable_concat(turnstileProcedure)
    .use(ratelimiter({ limit: 10, namespace: 'signUp.password' }))
    .input(
      z.object({
        username: zodSchemas.username(),
        password: strongPasswordSchema,
        twoFactorCode: z.string().min(6).max(6)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { username, password, twoFactorCode } = input;
      const { db, event } = ctx;

      const twoFaChallengeCookie = getCookie(event, 'un-2fa-challenge');
      if (!twoFaChallengeCookie) {
        return {
          success: false,
          error: '2FA cookie not found or expired, Please try to setup new 2FA'
        };
      }

      const authStorage = storage.auth;
      const twoFaChallenge = await authStorage.getItem(
        `un2faChallenge:${username}-${twoFaChallengeCookie}`
      );

      if (typeof twoFaChallenge !== 'string') {
        return {
          success: false,
          error:
            '2FA challenge was invalid or expired, Please try to setup new 2FA'
        };
      }

      const secret = decodeHex(twoFaChallenge);
      const isValid = await new TOTPController().verify(twoFactorCode, secret);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid 2FA code'
        };
      }

      const { accountId, publicId, recoveryCode } = await db.transaction(
        async (tx) => {
          try {
            // making sure someone doesn't bypass the client side validation
            const { available, error } = await validateUsername(tx, username);
            if (!available) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Username Error : ${error}`
              });
            }

            const passwordHash = await new Argon2id().hash(password);
            const publicId = typeIdGenerator('account');

            const recoveryCode = nanoIdToken();
            const hashedRecoveryCode = await new Argon2id().hash(recoveryCode);

            const newUser = await tx.insert(accounts).values({
              username,
              publicId,
              passwordHash,
              twoFactorEnabled: true,
              twoFactorSecret: twoFaChallenge,
              recoveryCode: hashedRecoveryCode
            });

            return {
              accountId: Number(newUser.insertId),
              publicId,
              recoveryCode
            };
          } catch (err) {
            tx.rollback();
            console.error(err);
            throw err;
          }
        }
      );

      await createLuciaSessionCookie(event, {
        accountId,
        username,
        publicId
      });

      deleteCookie(event, 'un-2fa-challenge');

      return { success: true, error: null, recoveryCode };
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

        storage.twoFactorLoginChallenges.setItem(twoFactorChallengeId, {
          account: userResponse,
          defaultOrgSlug: userResponse.orgMemberships[0]?.org.shortcode,
          secret: userResponse.twoFactorSecret
        });

        setCookie(
          ctx.event,
          'two-factor-login-challenge',
          twoFactorChallengeId,
          {
            maxAge: ms('5 minutes'),
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
    }),

  updateUserPassword: accountProcedure
    .input(
      z.object({
        oldPassword: z.string().min(8),
        newPassword: strongPasswordSchema,
        otp: zodSchemas.nanoIdToken(),
        invalidateAllSessions: z.boolean().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account, event } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true,
          passwordHash: true,
          twoFactorSecret: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!accountData.passwordHash) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Password sign-in is not enabled'
        });
      }

      const oldPasswordValid = await new Argon2id().verify(
        accountData.passwordHash,
        input.oldPassword
      );

      if (!oldPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect old password'
        });
      }

      if (!accountData.twoFactorSecret) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: '2FA is not enabled on this account, contact support'
        });
      }
      const secret = decodeHex(accountData.twoFactorSecret);
      const otpValid = await new TOTPController().verify(input.otp, secret);
      if (!otpValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
        });
      }

      const passwordHash = await new Argon2id().hash(input.newPassword);

      await db
        .update(accounts)
        .set({
          passwordHash
        })
        .where(eq(accounts.id, accountId));

      // Invalidate all sessions if requested
      if (input.invalidateAllSessions) {
        await lucia.invalidateUserSessions(accountId);
      }

      await createLuciaSessionCookie(event, {
        accountId,
        username: accountData.username,
        publicId: accountData.publicId
      });

      return { success: true };
    })
});
