import { z } from 'zod';
import { router, accountProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';

export const defaultsRouter = router({
  redirectionData: accountProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountResponse = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
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
          accountAccess: {
            columns: {
              twoFactorSecret: true,
              passwordHash: true
            }
          }
        }
      });

      if (!accountResponse) {
        throw new Error('User not found');
      }

      const twoFactorEnabledCorrectly = accountResponse.accountAccess
        .passwordHash
        ? !!accountResponse?.accountAccess?.twoFactorSecret
        : true;

      return {
        defaultOrgSlug: accountResponse?.orgMemberships[0]?.org?.slug || '',
        twoFactorEnabledCorrectly: twoFactorEnabledCorrectly
      };
    })
});
