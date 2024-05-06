import { z } from 'zod';
import { router, accountProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';

export const storeRouter = router({
  getStoreData: accountProcedure
    .input(
      z.object({
        orgShortCode: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const storeInitData = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          username: true,
          publicId: true
        },
        with: {
          orgMemberships: {
            columns: {},
            with: {
              profile: {
                columns: {
                  firstName: true,
                  lastName: true,
                  avatarTimestamp: true,
                  publicId: true,
                  title: true,
                  blurb: true
                }
              },
              org: {
                columns: {
                  shortcode: true,
                  publicId: true,
                  name: true,
                  avatarTimestamp: true
                }
              }
            }
          }
        }
      });
      if (!storeInitData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found'
        });
      }

      const orgsTransformed = storeInitData.orgMemberships.map(
        ({ org, profile }) => ({
          name: org.name,
          publicId: org.publicId,
          shortCode: org.shortcode,
          avatarTimestamp: org.avatarTimestamp,
          orgMemberProfile: profile
        })
      );

      const currentOrg = orgsTransformed.find(
        (o) => o.shortCode === input.orgShortCode
      );

      if (!currentOrg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid org short code'
        });
      }

      const { username, publicId } = storeInitData;

      const transformed = {
        user: { publicId, username },
        orgs: orgsTransformed,
        currentOrg
      };

      return transformed;
    })
});
