import { z } from 'zod';
import { router, accountProcedure, orgProcedure } from '../../trpc';
import { and, eq } from '@u22n/database/orm';
import { accounts, orgMembers } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';

export const defaultsRouter = router({
  redirectionData: accountProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const accountResponse = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          twoFactorSecret: true,
          passwordHash: true,
          twoFactorEnabled: true
        },
        with: {
          orgMemberships: {
            with: {
              org: {
                columns: {
                  shortcode: true
                }
              }
            }
          },
          authenticators: {
            columns: {
              id: true
            }
          }
        }
      });

      if (!accountResponse) {
        throw new Error('User not found');
      }

      const userHasPasskeys = accountResponse.authenticators.length > 0;

      const twoFactorEnabledCorrectly =
        accountResponse.passwordHash && accountResponse.twoFactorEnabled;

      return {
        defaultOrgShortcode:
          accountResponse?.orgMemberships[0]?.org?.shortcode || null,
        twoFactorEnabledCorrectly: userHasPasskeys
          ? true
          : twoFactorEnabledCorrectly
      };
    }),
  getIds: orgProcedure.input(z.object({}).strict()).query(async ({ ctx }) => {
    const { db, org } = ctx;

    const dbQuery = await db.query.orgMembers.findFirst({
      where: and(eq(orgMembers.id, org.memberId), eq(orgMembers.orgId, org.id)),
      columns: {
        publicId: true
      },
      with: {
        org: {
          columns: {
            publicId: true
          }
        }
      }
    });

    if (!dbQuery || !dbQuery?.org?.publicId || !dbQuery?.publicId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User not in org'
      });
    }

    return {
      orgPublicId: dbQuery.org.publicId,
      orgMemberPublicId: dbQuery.publicId
    };
  })
});
