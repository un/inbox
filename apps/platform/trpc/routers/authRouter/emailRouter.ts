import { z } from 'zod';
import { router, userProcedure } from '../../trpc';

export const emailRouter = router({
  emailVerificationCodeRequest: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;
      const userId = user.id;
      //! TODO: Send email verification code
      return {};
    }),

  emailVerificationCodeValidation: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;
      const userId = user.id;
      //! TODO: Validate email verification code
      return {};
    })
});
