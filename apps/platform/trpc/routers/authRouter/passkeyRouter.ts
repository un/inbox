import { z } from 'zod';
import { limitedProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { TRPCError } from '@trpc/server';
import {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import { nanoId } from '@uninbox/utils';
import { UAParser } from 'ua-parser-js';
import { usePasskeys } from '../../../utils/auth/passkeys';
import { usePasskeysDb } from '../../../utils/auth/passkeyDbAdaptor';
import { setCookie, getCookie, getHeader } from '#imports';
import { lucia } from '../../../utils/auth';

export const passkeyRouter = router({
  generateNewPasskeyChallenge: userProcedure
    .input(
      z
        .object({
          canUsePasskeyDirect: z.boolean()
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const userId = user.id;
      // Update to use read replicas when implemented - primary db
      const userResponse = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          publicId: true,
          username: true
        }
      });

      if (!userResponse) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User not found'
        });
      }

      const authenticatorAttachment = input.canUsePasskeyDirect
        ? 'platform'
        : 'cross-platform';

      const passkeyOptions = await usePasskeys.generateRegistrationOptions({
        userId: userId,
        userPublicId: userResponse.publicId,
        userName: userResponse.username,
        userDisplayName: userResponse.username,
        authenticatorAttachment: authenticatorAttachment
      });

      return { options: passkeyOptions };
    }),

  addNewPasskey: userProcedure
    .input(
      z
        .object({
          registrationResponseRaw: z.any(),
          nickname: z.string().min(3).max(32).default('Passkey')
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const userId = user.id;
      const registrationResponse =
        input.registrationResponseRaw as RegistrationResponseJSON;

      const passkeyVerification = await usePasskeys.verifyRegistrationResponse({
        registrationResponse: registrationResponse,
        userId: userId
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

      const userAccount = await db.query.accounts.findFirst({
        where: eq(accounts.userId, userId),
        columns: {
          id: true
        }
      });

      if (!userAccount || !userAccount.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User account not found'
        });
      }

      const insertPasskey = await usePasskeysDb.createAuthenticator(
        {
          accountId: userAccount.id,
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
        input.nickname
      );

      if (!insertPasskey.credentialID) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong adding your passkey, please try again'
        });
      }

      return { success: true };
    }),

  generatePasskeyChallenge: limitedProcedure
    .input(z.object({ turnstileToken: z.string() }).strict())
    .query(async ({ ctx }) => {
      const { event } = ctx;

      const authChallengeId = nanoId();

      setCookie(event, 'unauth-challenge', authChallengeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 5
      });
      const passkeyOptions = await usePasskeys.generateAuthenticationOptions({
        authChallengeId: authChallengeId
      });

      return { options: passkeyOptions };
    }),

  verifyPasskey: limitedProcedure
    .input(
      z
        .object({
          turnstileToken: z.string(),
          verificationResponseRaw: z.any()
        })
        .strict()
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

      const userAccount = await db.query.accounts.findFirst({
        where: eq(accounts.id, passkeyVerification.userAccount),
        columns: {
          id: true
        },
        with: {
          user: {
            columns: {
              id: true,
              publicId: true,
              username: true
            }
          }
        }
      });
      if (!userAccount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User account not found'
        });
      }
      const user = userAccount.user;

      const { device, os } = UAParser(await getHeader(ctx.event, 'User-Agent'));
      const userDevice =
        device.type === 'mobile' ? device.toString() : device.vendor;

      const userSession = await lucia.createSession(user.publicId, {
        user: {
          id: user.id,
          username: user.username,
          publicId: user.publicId
        },
        device: userDevice || 'Unknown',
        os: os.name || 'Unknown'
      });
      const cookie = lucia.createSessionCookie(userSession.id);
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);

      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      return { success: true };
    })
});
