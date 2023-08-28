import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, publicProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';
import { nanoid } from '@uninbox/utils';

export const testRouter = router({
  runTest: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20)
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.users.findFirst({
        where: eq(users.id, 1)
      });

      const insert = await ctx.db.insert(users).values({
        username: input.username,
        publicId: nanoid()
      });

      return { input: input.username, result: result, insert };
    })
});
