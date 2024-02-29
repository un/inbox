import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, userProcedure, limitedProcedure } from '../../trpc';
import type { DBType } from '@uninbox/database';
import { and, eq, or } from '@uninbox/database/orm';
import { Argon2id } from 'oslo/password';
import { accounts, users } from '@uninbox/database/schema';
import { nanoId, zodSchemas } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';
import { validateEmailAddress } from './signupRouter';

export const securityRouter = router({
  validateEmailAddress: limitedProcedure
    .input(
      z.object({
        email: z.string().email()
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateEmailAddress(input.email);
    }),

  checkPassword: userProcedure
    .input(
      z
        .object({
          password: z
            .string()
            .min(8, { message: 'Minimum 8 characters' })
            .max(64)
            .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/, {
              message:
                'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
            })
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user!.id;
      const { password } = input;
      const hashedPassword = await new Argon2id().hash(password);

      const userResponse = await db.query.accounts.findFirst({
        where: eq(accounts.userId, userId),
        columns: {
          passwordEnabled: true,
          passwordHash: true
        }
      });

      if (!userResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (!userResponse.passwordEnabled || !userResponse.passwordHash) {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Password signin is not enabled'
        });
      }

      const validPassword = await new Argon2id().verify(
        userResponse.passwordHash,
        password
      );
      if (!validPassword) {
        throw createError({
          message: 'Incorrect username or password',
          statusCode: 400
        });
      }
      return { success: true };
    }),

  setPassword: userProcedure
    .input(
      z
        .object({
          password: z
            .string()
            .min(8, { message: 'Minimum 8 characters' })
            .max(64)
            .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/, {
              message:
                'At least one digit, one lowercase letter, one uppercase letter, one special character, no whitespace allowed, minimum eight characters in length'
            })
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      const hashedPassword = await new Argon2id().hash(input.password);

      await db
        .update(accounts)
        .set({
          passwordEnabled: true,
          passwordHash: hashedPassword
        })
        .where(eq(accounts.userId, userId));

      return { success: true };
    }),

  getCredentials: userProcedure.query(async ({ ctx, input }) => {
    const { db, user } = ctx;
    const userId = user.id;

    const credentialsQuery = await db.query.accounts.findFirst({
      where: eq(accounts.userId, userId),
      columns: {
        passwordEnabled: true,
        recoveryEmail: true,
        // emailVerified: true,
        passkeysEnabled: true
      }
    });

    if (!credentialsQuery || !credentialsQuery) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'We couldnt find your profile, please contact support.'
      });
    }
    return {
      profile: credentialsQuery
    };
  }),

  updateCredentials: userProcedure
    .input(
      z.object({
        passwordEnabled: z.boolean(),
        recoveryEmail: z.string(),
        // emailVerified: z.date(),
        passkeysEnabled: z.boolean()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.id;

      await db
        .update(accounts)
        .set({
          passwordEnabled: input.passwordEnabled,
          recoveryEmail: input.recoveryEmail,
          // emailVerified: input.emailVerified,
          passkeysEnabled: input.passkeysEnabled
        })
        .where(eq(accounts.userId, userId));

      return {
        success: true
      };
    })
});
