import { z } from 'zod';
import { limitedProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { accounts, users } from '@uninbox/database/schema';
import { TRPCError } from '@trpc/server';
import {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';
import { nanoId, zodSchemas } from '@uninbox/utils';
import { UAParser } from 'ua-parser-js';
import { usePasskeys } from '../../../utils/auth/passkeys';
import { usePasskeysDb } from '../../../utils/auth/passkeyDbAdaptor';
import { setCookie, getCookie, getHeader } from '#imports';
import { lucia } from '../../../utils/auth';
import { validateUsername } from './signupRouter';
import { createLuciaSessionCookie } from '../../../utils/session';

export const passkeyRouter = router({
  // generateNewPasskeyChallenge: userProcedure
  //   .input(
  //     z
  //       .object({
  //         authenticatorType: z.enum(['platform', 'cross-platform'])
  //       })
  //       .strict()
  //   )
  //   .query(async ({ ctx, input }) => {
  //     const { db, user } = ctx;

  //     const userId = user.id;
  //     // Update to use read replicas when implemented - primary db
  //     const userResponse = await db.query.users.findFirst({
  //       where: eq(users.id, userId),
  //       columns: {
  //         id: true,
  //         publicId: true,
  //         username: true
  //       }
  //     });

  //     if (!userResponse) {
  //       throw new TRPCError({
  //         code: 'BAD_REQUEST',
  //         message: 'User not found'
  //       });
  //     }

  //     const authenticatorAttachment = input.authenticatorType;

  //     const passkeyOptions = await usePasskeys.generateRegistrationOptions({
  //       userId: userId,
  //       userPublicId: userResponse.publicId,
  //       userName: userResponse.username,
  //       userDisplayName: userResponse.username,
  //       authenticatorAttachment: authenticatorAttachment
  //     });

  //     return { options: passkeyOptions };
  //   }),

  signUpWithPasskeyStart: limitedProcedure
    .input(
      z.object({
        username: zodSchemas.username(),
        authenticatorType: z.enum(['platform', 'cross-platform'])
      })
    )
    .query(async ({ input }) => {
      const { username, authenticatorType } = input;
      const publicId = nanoId();
      const passkeyOptions = await usePasskeys.generateRegistrationOptions({
        userDisplayName: username,
        userName: username,
        userPublicId: publicId,
        authenticatorAttachment: authenticatorType
      });
      return { publicId, options: passkeyOptions };
    }),
  signUpWithPasskeyFinish: limitedProcedure
    .input(
      z.object({
        registrationResponseRaw: z.any(),
        username: zodSchemas.username(),
        publicId: z.string(),
        nickname: z.string().min(3).max(32).default('Passkey')
      })
    )
    .query(async ({ input, ctx }) => {
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

      // making sure someone doesn't bypass the client side validation
      const { available, error } = await validateUsername(db, input.username);
      if (!available) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: error
        });
      }

      const userId = await db
        .transaction(async (tx) => {
          const newUser = await tx.insert(users).values({
            username: input.username,
            publicId: input.publicId
          });
          await tx.insert(accounts).values({
            userId: Number(newUser.insertId)
          });
          const insertPasskey = await usePasskeysDb.createAuthenticator(
            {
              accountId: Number(newUser.insertId),
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
            tx.rollback();
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                'Something went wrong adding your passkey, please try again'
            });
          }
          return Number(newUser.insertId);
        })
        .catch((err) => {
          console.error(err);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'Something went wrong adding your passkey, please try again'
          });
        });

      const cookie = await createLuciaSessionCookie(ctx.event, {
        userId,
        username: input.username,
        publicId: input.publicId
      });
      setCookie(ctx.event, cookie.name, cookie.value, cookie.attributes);
      return { success: true };
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

      const publicId = user.session.attributes.user.publicId;
      const registrationResponse =
        input.registrationResponseRaw as RegistrationResponseJSON;

      const passkeyVerification = await usePasskeys.verifyRegistrationResponse({
        registrationResponse: registrationResponse,
        publicId: publicId
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
        where: eq(accounts.userId, user.id),
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
    .input(z.object({}))
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

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      return { success: true };
    })
});
