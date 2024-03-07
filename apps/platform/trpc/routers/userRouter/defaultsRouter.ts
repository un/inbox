import { z } from 'zod';
import { router, userProcedure } from '../../trpc';
import { eq } from '@uninbox/database/orm';
import { users } from '@uninbox/database/schema';

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

      const twoFactorEnabledCorrectly = () => {
        if (userResponse.account.passwordHash) {
          return !!userResponse?.account?.twoFactorSecret;
        }
        return true;
      };

      return {
        defaultOrgSlug: userResponse?.orgMemberships[0]?.org?.slug || '',
        twoFactorEnabledCorrectly: twoFactorEnabledCorrectly
      };
    })
});
