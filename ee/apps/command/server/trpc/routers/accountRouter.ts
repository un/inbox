import { z } from 'zod';
import { router, accountProcedure } from '../trpc';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { accounts, type AccountMetadata } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';

export const accountRouter = router({
  getAccountData: accountProcedure
    .input(
      z.object({
        username: z.string()
      })
    )
    .query(async ({ input }) => {
      //const { config, db } = ctx;

      const accountDataQuery = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username),
        columns: {
          id: true,
          publicId: true,
          username: true,
          createdAt: true,
          metadata: true,
          preAccount: true,
          recoveryCode: true,
          lastLoginAt: true
        }
      });
      return {
        account: accountDataQuery
      };
    }),
  addUninOffer: accountProcedure
    .input(
      z.object({
        username: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      //const { config, db } = ctx;

      const accountDataQuery = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username),
        columns: {
          id: true,
          metadata: true
        }
      });
      if (!accountDataQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found'
        });
      }

      // if already has bonus, return
      if (accountDataQuery.metadata?.bonuses?.find((b) => b.item === 'unin')) {
        return {
          success: true,
          orgMetadata: accountDataQuery.metadata
        };
      }

      const newAccountMetadata: AccountMetadata =
        accountDataQuery.metadata || {};
      newAccountMetadata.bonuses = newAccountMetadata.bonuses || []; // Initialize bonuses as an empty array if it is undefined
      newAccountMetadata.bonuses.push({
        item: 'unin',
        awardedAt: new Date(),
        awardedByAccountId: ctx.account.id,
        awardedByName: ctx.account.username,
        bonus: {
          enabled: true
        },
        bonusReason: 'Launch offer',
        note: 'Unin offer by Omar'
      });

      await db
        .update(accounts)
        .set({
          metadata: newAccountMetadata
        })
        .where(eq(accounts.id, Number(accountDataQuery.id)));

      return {
        accountId: accountDataQuery.id,
        metadata: newAccountMetadata
      };
    })
});
