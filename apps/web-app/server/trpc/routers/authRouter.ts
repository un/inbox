import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, publicProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';

export const registrationRouter = router({
  checkUsernameAvailability: publicProcedure
    .input(
      z.object({
        username: z.string().min(5).max(32)
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const userLoggedIn = ctx.session.isUserLoggedIn;
      const username = input.username;
      ctx.db.query.users.findFirst({ where: eq(users.id, 1) });
      return { loggedIn: userLoggedIn, name: username };
    })
});
