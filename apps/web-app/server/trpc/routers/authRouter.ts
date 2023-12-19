import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { limitedProcedure, router, userProcedure } from '../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';

export const authRouter = router({
  getUserDefaultOrgSlug: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user?.id || 0;

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
    })
});
