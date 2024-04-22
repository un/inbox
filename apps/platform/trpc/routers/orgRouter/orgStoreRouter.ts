import { z } from 'zod';
import { router, accountProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import { accounts } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';

export const storeRouter = router({
  getStoreData: accountProcedure.input(z.object({})).query(async ({ ctx }) => {
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
    return storeInitData;
  })
});
