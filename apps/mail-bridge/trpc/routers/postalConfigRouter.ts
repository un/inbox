import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, protectedProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';

export const postalConfigRouter = router({
  createOrg: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20)
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const userLoggedIn = ctx.auth;
      const username = input.username;

      return { loggedIn: userLoggedIn, name: username };
    })
});
