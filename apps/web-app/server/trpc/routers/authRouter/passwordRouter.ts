import { z } from 'zod';
import { limitedProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';

export const passwordRouter = router({
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
    })
});
