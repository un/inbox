import { z } from 'zod';
import { router, userProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { users } from '@u22n/database/schema';

export const defaultsRouter = router({
  redirectionData: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;
      const userId = user.id;

      const userResponse = await db.query.users.findFirst({
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
          },
          account: {
            columns: {
              twoFactorSecret: true,
              passwordHash: true
            }
          }
        }
      });

      const twoFactorEnabledCorrectly = userResponse.account.passwordHash
        ? !!userResponse?.account?.twoFactorSecret
        : true;

      return {
        defaultOrgSlug: userResponse?.orgMemberships[0]?.org?.slug || '',
        twoFactorEnabledCorrectly: twoFactorEnabledCorrectly
      };
    })
});
