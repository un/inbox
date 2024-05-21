import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '~platform/utils/auth/passkeys';
import { z } from 'zod';
import { router, accountProcedure } from '~platform/trpc/trpc';
import { and, eq } from '@u22n/database/orm';
import { accounts, authenticators, sessions } from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils/typeid';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import {
  strongPasswordSchema,
  calculatePasswordStrength
} from '@u22n/utils/password';
import { datePlus } from '@u22n/utils/ms';
import { TRPCError } from '@trpc/server';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/types';
import { Argon2id } from 'oslo/password';
import { createAuthenticator } from '~platform/utils/auth/passkeyUtils';
import { decodeHex, encodeHex } from 'oslo/encoding';
import { TOTPController, createTOTPKeyURI } from 'oslo/otp';
import { lucia } from '~platform/utils/auth';
import { storage } from '~platform/storage';
import { env } from '~platform/env';

const authStorage = storage.auth;

export const securityRouter = router({
  getSecurityOverview: accountProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountObjectQuery = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          passwordHash: true,
          recoveryCode: true,
          twoFactorEnabled: true,
          twoFactorSecret: true
        },
        with: {
          authenticators: {
            columns: {
              publicId: true,
              createdAt: true,
              nickname: true
            }
          },
          sessions: {
            columns: {
              publicId: true,
              os: true,
              device: true,
              createdAt: true
            }
          }
        }
      });

      if (!accountObjectQuery) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account not found'
        });
      }

      return {
        passwordSet: !!accountObjectQuery.passwordHash,
        recoveryCodeSet: !!accountObjectQuery.recoveryCode,
        legacySecurityEnabled:
          Boolean(accountObjectQuery.passwordHash) &&
          accountObjectQuery.twoFactorEnabled &&
          Boolean(accountObjectQuery.twoFactorSecret),
        twoFactorEnabled:
          accountObjectQuery.twoFactorEnabled &&
          !!accountObjectQuery.twoFactorSecret,
        passkeys: accountObjectQuery.authenticators || [],
        sessions: accountObjectQuery.sessions || []
      };
    }),

  generatePasskeyVerificationChallenge: accountProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { event, account } = ctx;

      const accountQuery = await ctx.db.query.accounts.findFirst({
        where: eq(accounts.id, account.id),
        columns: {
          id: true
        }
      });

      if (!accountQuery) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account credentials not found'
        });
      }

      const authChallengeId = nanoIdToken();

      setCookie(event, 'unauth-challenge', authChallengeId, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 60 * 5,
        domain: env.PRIMARY_DOMAIN
      });

      const passkeyOptions = await generateAuthenticationOptions({
        authChallengeId: authChallengeId,
        accountId: accountQuery.id
      });

      return { options: passkeyOptions };
    }),

  getVerificationToken: accountProcedure
    .input(
      z.union([
        z.object({
          password: z.string().min(8),
          twoFactorCode: z.string()
        }),
        z.object({
          verificationResponseRaw: z.any()
        })
      ])
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountObjectQuery = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true
        }
      });

      if (!accountObjectQuery) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Account not found'
        });
      }

      if ('verificationResponseRaw' in input) {
        const verificationResponse =
          input.verificationResponseRaw as AuthenticationResponseJSON;

        const challengeCookie = getCookie(ctx.event, 'unauth-challenge');
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
      } else if ('password' in input) {
        const accountQuery = await db.query.accounts.findFirst({
          where: eq(accounts.id, accountId),
          columns: {
            passwordHash: true,
            twoFactorSecret: true,
            twoFactorEnabled: true
          }
        });

        if (!accountQuery) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found'
          });
        }

        if (!accountQuery.passwordHash) {
          throw new TRPCError({
            code: 'METHOD_NOT_SUPPORTED',
            message: 'Password verification is not enabled'
          });
        }

        const validPassword = await new Argon2id().verify(
          accountQuery.passwordHash,
          input.password
        );

        if (!validPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Password verification failed'
          });
        }

        // We check if 2FA is enabled and if so, we verify the 2FA code
        // this is for older accounts which were affected by the 2FA bug
        if (accountQuery.twoFactorEnabled && accountQuery.twoFactorSecret) {
          const secret = decodeHex(accountQuery.twoFactorSecret);
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
        }
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid input'
        });
      }

      const token = nanoIdToken();
      authStorage.setItem(
        `authVerificationToken: ${accountObjectQuery.publicId}`,
        token
      );

      return {
        token: token
      };
    }),

  //* passwords
  checkPasswordStrength: accountProcedure
    .input(
      z.object({
        password: z.string()
      })
    )
    .query(({ input }) => calculatePasswordStrength(input.password)),

  disableLegacySecurity: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
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

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      await db
        .update(accounts)
        .set({
          passwordHash: null,
          twoFactorSecret: null,
          twoFactorEnabled: false
        })
        .where(eq(accounts.id, accountId));

      return { success: true };
    }),

  resetPassword: accountProcedure
    .input(
      z.object({
        newPassword: strongPasswordSchema,
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const passwordHash = await new Argon2id().hash(input.newPassword);

      await db
        .update(accounts)
        .set({
          passwordHash
        })
        .where(eq(accounts.id, accountId));

      return { success: true };
    }),

  /**
   * @deprecated use `generateTwoFactorResetChallenge` as that one doesn't reset the 2FA secret, unless the user completes the reset
   */
  resetTwoFactorSecret: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { account, db } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const newSecret = crypto.getRandomValues(new Uint8Array(20));
      await db
        .update(accounts)
        .set({ twoFactorSecret: encodeHex(newSecret), twoFactorEnabled: false })
        .where(eq(accounts.id, accountId));
      const uri = createTOTPKeyURI(
        'UnInbox.com',
        accountData.username,
        newSecret
      );
      return { uri };
    }),

  /**
   * @deprecated use `verifyTwoFactorResetChallenge` with the `generateTwoFactorResetChallenge` to reset the 2FA secret
   */
  completeTwoFactorReset: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken(),
        code: z.string().min(6).max(6)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { account, db } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true,
          twoFactorSecret: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!accountData.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not enabled'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const secret = decodeHex(accountData.twoFactorSecret);
      const isValid = await new TOTPController().verify(input.code, secret);

      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
        });
      }

      await db
        .update(accounts)
        .set({ twoFactorEnabled: true })
        .where(eq(accounts.id, accountId));

      return { success: true };
    }),

  generateTwoFactorResetChallenge: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .query(async ({ ctx, input }) => {
      const { verificationToken } = input;
      const { db, account } = ctx;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, account.id),
        columns: {
          publicId: true,
          username: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const existingChallengeId = getCookie(
        ctx.event,
        'un-2fa-reset-challenge'
      );
      if (existingChallengeId) {
        const encodedSecret = await authStorage.getItem<string>(
          `un-2fa-reset-challenge:${existingChallengeId}`
        );
        if (encodedSecret) {
          return {
            uri: createTOTPKeyURI(
              'UnInbox.com',
              accountData.username,
              decodeHex(encodedSecret)
            )
          };
        }
      }

      const newSecret = crypto.getRandomValues(new Uint8Array(20));
      const uri = createTOTPKeyURI(
        'UnInbox.com',
        accountData.username,
        newSecret
      );

      const un2faResetChallengeId = nanoIdToken();
      authStorage.setItem(
        `un-2fa-reset-challenge:${un2faResetChallengeId}`,
        encodeHex(newSecret)
      );

      setCookie(ctx.event, 'un-2fa-reset-challenge', un2faResetChallengeId, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'Strict',
        expires: datePlus('5 minutes'),
        domain: env.PRIMARY_DOMAIN
      });

      return { uri };
    }),

  verifyTwoFactorResetChallenge: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken(),
        code: z.string().min(6).max(6)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { verificationToken, code } = input;
      const { db, account } = ctx;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, account.id),
        columns: {
          publicId: true,
          username: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const challengeId = getCookie(ctx.event, 'un-2fa-reset-challenge');
      if (!challengeId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA Challenge cookie not found or expired, please try again'
        });
      }

      const encodedSecret = await authStorage.getItem<string>(
        `un-2fa-reset-challenge:${challengeId}`
      );

      if (!encodedSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA Challenge cookie not found or expired, please try again'
        });
      }

      const secret = decodeHex(encodedSecret);
      const isValid = await new TOTPController().verify(code, secret);

      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
        });
      }

      await db
        .update(accounts)
        .set({ twoFactorSecret: encodedSecret, twoFactorEnabled: true })
        .where(eq(accounts.id, account.id));

      deleteCookie(ctx.event, 'un-2fa-reset-challenge');
      authStorage.removeItem(`un-2fa-reset-challenge:${challengeId}`);

      return { success: true };
    }),

  disableRecoveryCode: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { account, db } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      await db
        .update(accounts)
        .set({ recoveryCode: null })
        .where(eq(accounts.id, accountId));

      return { success: true };
    }),

  resetRecoveryCode: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { account, db } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const newRecoveryCode = nanoIdToken();
      await db
        .update(accounts)
        .set({ recoveryCode: await new Argon2id().hash(newRecoveryCode) })
        .where(eq(accounts.id, accountId));

      return { recoveryCode: newRecoveryCode };
    }),

  //* passkeys
  generateNewPasskeyChallenge: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken(),
        /**
         * @deprecated Let the browser decide
         */
        authenticatorType: z.enum(['platform', 'cross-platform']).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const passkeyOptions = await generateRegistrationOptions({
        userDisplayName: accountData.username,
        username: accountData.username,
        accountPublicId: accountData.publicId
      });
      return { options: passkeyOptions };
    }),

  addNewPasskey: accountProcedure
    .input(
      z.object({
        registrationResponseRaw: z.any(),
        nickname: z.string().min(3).max(32).default('Passkey'),
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const registrationResponse =
        input.registrationResponseRaw as RegistrationResponseJSON;

      const passkeyVerification = await verifyRegistrationResponse({
        registrationResponse: registrationResponse,
        publicId: accountData.publicId
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

      const accountQuery = await db.query.accounts.findFirst({
        where: eq(accounts.id, account.id),
        columns: {
          id: true
        }
      });

      if (!accountQuery || !accountQuery.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User account not found'
        });
      }

      const insertPasskey = await createAuthenticator(
        {
          accountId: accountQuery.id,
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

  deletePasskey: accountProcedure
    .input(
      z.object({
        passkeyPublicId: typeIdValidator('accountPasskey'),
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          publicId: true,
          username: true,
          passwordHash: true,
          twoFactorSecret: true
        },
        with: {
          authenticators: {
            columns: {
              id: true
            }
          }
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const hasPassword = !!accountData.passwordHash;
      const hasOtherPassKeys = accountData.authenticators.length > 1;

      if (!hasPassword && !hasOtherPassKeys) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You must have at least one passkey, or a password set.'
        });
      }

      await db
        .delete(authenticators)
        .where(eq(authenticators.publicId, input.passkeyPublicId));

      return { success: true };
    }),

  deleteSession: accountProcedure
    .input(
      z.object({
        sessionPublicId: typeIdValidator('accountSession'),
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          id: true,
          publicId: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      const sessionQuery = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.publicId, input.sessionPublicId),
          eq(sessions.accountId, accountData.id)
        ),
        columns: {
          sessionToken: true
        }
      });

      if (!sessionQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        });
      }

      await lucia.invalidateSession(sessionQuery.sessionToken);

      return { success: true };
    }),
  deleteAllSessions: accountProcedure
    .input(
      z.object({
        verificationToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          id: true,
          publicId: true
        }
      });

      if (!accountData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!input.verificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is required'
        });
      }

      const storedVerificationToken = await authStorage.getItem(
        `authVerificationToken: ${accountData.publicId}`
      );

      if (input.verificationToken !== storedVerificationToken) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'VerificationToken is invalid'
        });
      }

      await lucia.invalidateUserSessions(accountData.id);

      return { success: true };
    })
});
