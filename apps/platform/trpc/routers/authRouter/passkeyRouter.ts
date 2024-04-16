import { z } from 'zod';
import { router, publicRateLimitedProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import {
  nanoIdToken,
  typeIdGenerator,
  typeIdValidator,
  zodSchemas
} from '@u22n/utils';
import { UAParser } from 'ua-parser-js';
import { usePasskeys } from '../../../utils/auth/passkeys';
import { usePasskeysDb } from '../../../utils/auth/passkeyDbAdaptor';
import { setCookie, getCookie, getHeader } from 'h3';
import { lucia } from '../../../utils/auth';
import { validateUsername } from './signupRouter';
import { createLuciaSessionCookie } from '../../../utils/session';
import { useRuntimeConfig } from '#imports';

export const passkeyRouter = router({
  signUpWithPasskeyStart: publicRateLimitedProcedure.signUpPasskeyStart
    .input(
      z.object({
        username: zodSchemas.username(),
        authenticatorType: z.enum(['platform', 'cross-platform'])
      })
    )
    .query(async ({ input, ctx }) => {
      const { db } = ctx;
      const { username, authenticatorType } = input;
      const { available, error } = await validateUsername(db, input.username);
      if (!available) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error || "Username isn't available"
        });
      }

      const publicId = typeIdGenerator('account');
      const passkeyOptions = await usePasskeys.generateRegistrationOptions({
        userDisplayName: username,
        username: username,
        accountPublicId: publicId,
        authenticatorAttachment: authenticatorType
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

      const passkeyVerification = await usePasskeys.verifyRegistrationResponse({
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

          const insertPasskey = await usePasskeysDb.createAuthenticator(
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

      const cookie = await createLuciaSessionCookie(ctx.event, {
        accountId,
        username: input.username,
        publicId: input.publicId
      });
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);
      return { success: true };
    }),

  generatePasskeyChallenge: publicRateLimitedProcedure.generatePasskeyChallenge
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { event } = ctx;

      const authChallengeId = nanoIdToken();

      setCookie(event, 'unauth-challenge', authChallengeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 5,
        domain: useRuntimeConfig().primaryDomain
      });
      const passkeyOptions = await usePasskeys.generateAuthenticationOptions({
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
      const { db } = ctx;

      const verificationResponse =
        input.verificationResponseRaw as AuthenticationResponseJSON;

      const challengeCookie = getCookie(ctx.event, 'unauth-challenge');
      if (!challengeCookie) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Challenge not found, try again'
        });
      }

      const passkeyVerification =
        await usePasskeys.verifyAuthenticationResponse({
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
        }
      });

      if (!account) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account not found, please contact support'
        });
      }

      const { device, os } = UAParser(getHeader(ctx.event, 'User-Agent'));
      const userDevice =
        device.type === 'mobile' ? device.toString() : device.vendor;

      const accountSession = await lucia.createSession(account.id, {
        account: {
          id: account.id,
          username: account.username,
          publicId: account.publicId
        },
        device: userDevice || 'Unknown',
        os: os.name || 'Unknown'
      });
      const cookie = lucia.createSessionCookie(accountSession.id);
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      await db
        .update(accounts)
        .set({ lastLoginAt: new Date() })
        .where(eq(accounts.id, account.id));

      return { success: true };
    })
});
