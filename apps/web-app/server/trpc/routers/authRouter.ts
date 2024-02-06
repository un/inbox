import { z } from 'zod';
import { limitedProcedure, router, userProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';

export const authRouter = router({
  getUserDefaultOrgSlug: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;
      const userId = user.id;

      const userDefaultOrgSlug = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          orgMemberships: {
            with: {
              org: {
                columns: {
                  slug: true
                }
              }
            }
          }
        }
      });

      return { slug: userDefaultOrgSlug?.orgMemberships[0].org.slug };
    }),

  emailVerificationCodeRequest: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;
      const userId = user.id;

      return {};
    }),

  emailVerificationCodeValidation: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;
      const userId = user.id;

      return {};
    }),

  generatePasskeyChallenge: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;

      const userId = user.id;

      return {};
    }),

  addNewPasskey: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;

      const userId = user.id;

      return {};
    }),

  verifyPasskey: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;

      const userId = user.id;

      return {};
    }),

  setUserPassword: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;

      const userId = user.id;

      return {};
    }),

  passwordSignIn: limitedProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;

      return {};
    }),

  requestDeviceSignin: limitedProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;

      return {};
    })
});
