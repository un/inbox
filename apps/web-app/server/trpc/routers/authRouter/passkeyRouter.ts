import { z } from 'zod';
import { limitedProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';

export const passkeyRouter = router({
  generateNewPasskeyChallenge: userProcedure
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

  generatePasskeyChallenge: userProcedure
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
    })
});
