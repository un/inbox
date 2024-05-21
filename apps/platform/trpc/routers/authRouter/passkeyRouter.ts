import { z } from 'zod';
import { router, publicRateLimitedProcedure } from '~platform/trpc/trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { ms } from '@u22n/utils/ms';
import {
  verifyRegistrationResponse,
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '~platform/utils/auth/passkeys';
import { createAuthenticator } from '~platform/utils/auth/passkeyUtils';
import { validateUsername } from './signupRouter';
import { createLuciaSessionCookie } from '~platform/utils/session';
import { env } from '~platform/env';
import { getCookie, setCookie } from 'hono/cookie';

export const passkeyRouter = router({
  signUpWithPasskeyStart: publicRateLimitedProcedure.signUpPasskeyStart
    .input(
      z.object({
        username: zodSchemas.username()
      })
    )
    .query(async ({ input, ctx }) => {
      const { db } = ctx;
      const { username } = input;
      const { available, error } = await validateUsername(db, input.username);
      if (!available) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error || "Username isn't available"
        });
      }

      const publicId = typeIdGenerator('account');
      const passkeyOptions = await generateRegistrationOptions({
        userDisplayName: username,
        username: username,
        accountPublicId: publicId
      });
      return { publicId, options: passkeyOptions };
    }),
  signUpWithPasskeyFinish: publicRateLimitedProcedure.signUpPasskeyFinish
    .input(
      z.object({
        registrationResponseRaw: z.any(),
        username: zodSchemas.username(),
        publicId: typeIdValidator('account'),
        nickname: z.string().min(3).max(32).default('Passkey')
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const registrationResponse =
        input.registrationResponseRaw as RegistrationResponseJSON;

      const passkeyVerification = await verifyRegistrationResponse({
        registrationResponse: registrationResponse,
        publicId: input.publicId
      });

      if (
        !passkeyVerification.verified ||
        !passkeyVerification.registrationInfo
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Passkey verification failed'
        });
      }

      const accountId = await db.transaction(async (tx) => {
        try {
          // making sure someone doesn't bypass the client side validation
          const { available, error } = await validateUsername(
            tx,
            input.username
          );
          if (!available) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: error || "Username isn't available"
            });
          }

          const newAccount = await tx.insert(accounts).values({
            username: input.username,
            publicId: input.publicId
          });

          if (!passkeyVerification.registrationInfo) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Passkey verification failed'
            });
          }

          const insertPasskey = await createAuthenticator(
            {
              accountId: Number(newAccount.insertId),
              credentialID: passkeyVerification.registrationInfo.credentialID,
              credentialPublicKey:
                passkeyVerification.registrationInfo.credentialPublicKey,
              credentialDeviceType:
                passkeyVerification.registrationInfo.credentialDeviceType,
              credentialBackedUp:
                passkeyVerification.registrationInfo.credentialBackedUp,
              transports: registrationResponse.response.transports,
              counter: passkeyVerification.registrationInfo.counter
            },
            input.nickname,
            tx
          );

          if (!insertPasskey.credentialID) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                'Something went wrong adding your passkey, please try again'
            });
          }

          return Number(newAccount.insertId);
        } catch (err) {
          tx.rollback();
          console.error(err);
          throw err;
        }
      });

      await createLuciaSessionCookie(ctx.event, {
        accountId,
        username: input.username,
        publicId: input.publicId
      });

      return { success: true };
    }),

  generatePasskeyChallenge: publicRateLimitedProcedure.generatePasskeyChallenge
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { event } = ctx;

      const authChallengeId = nanoIdToken();

      setCookie(event, 'unauth-challenge', authChallengeId, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: ms('5 minutes'),
        domain: env.PRIMARY_DOMAIN
      });
      const passkeyOptions = await generateAuthenticationOptions({
        authChallengeId: authChallengeId
      });

      return { options: passkeyOptions };
    }),

  verifyPasskey: publicRateLimitedProcedure.verifyPasskey
    .input(
      z.object({
        verificationResponseRaw: z.any()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, event } = ctx;

      const verificationResponse =
        input.verificationResponseRaw as AuthenticationResponseJSON;

      const challengeCookie = getCookie(event, 'unauth-challenge');
      if (!challengeCookie) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Challenge not found, try again'
        });
      }

      const passkeyVerification = await verifyAuthenticationResponse({
        authenticationResponse: verificationResponse,
        authChallengeId: challengeCookie
      });

      if (
        !passkeyVerification.result.verified ||
        !passkeyVerification.result.authenticationInfo
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Passkey verification failed'
        });
      }

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, passkeyVerification.accountId),
        columns: {
          id: true,
          publicId: true,
          username: true
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

      if (!account) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account not found, please contact support'
        });
      }

      await createLuciaSessionCookie(ctx.event, {
        accountId: account.id,
        username: account.username,
        publicId: account.publicId
      });

      const defaultOrg = account.orgMemberships.sort((a, b) => a.id - b.id)[0]
        ?.org.shortcode;

      return { success: true, defaultOrg };
    })
});
