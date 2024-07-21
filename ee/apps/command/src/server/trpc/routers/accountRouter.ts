import { accounts, type AccountMetadata } from '@u22n/database/schema';
import { router, accountProcedure } from '../trpc';
import { createTOTPKeyURI } from 'oslo/otp';
import { encodeHex } from 'oslo/encoding';
import { Argon2id } from 'oslo/password';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { z } from 'zod';

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

      if (!accountDataQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found'
        });
      }

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
        accountDataQuery.metadata ?? {};
      newAccountMetadata.bonuses = newAccountMetadata.bonuses ?? []; // Initialize bonuses as an empty array if it is undefined
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
    }),
  getFullAccountData: accountProcedure
    .input(
      z.object({
        username: z.string()
      })
    )
    .query(async ({ input }) => {
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
        },
        with: {
          orgMemberships: {
            columns: {
              role: true,
              status: true
            },
            with: {
              org: {
                columns: {
                  name: true,
                  id: true,
                  publicId: true,
                  shortcode: true
                }
              },
              authorizedEmailIdentities: {
                with: {
                  emailIdentity: true
                }
              }
            }
          },
          orgMemberProfiles: true,
          authenticators: true,
          personalEmailIdentities: {
            with: {
              emailIdentity: true
            }
          },
          sessions: true
        }
      });
      return {
        account: accountDataQuery
      };
    }),
  resetPassword: accountProcedure
    .input(
      z.object({
        username: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const newPassword = Buffer.from(
        crypto.getRandomValues(new Uint8Array(16)).join('')
      ).toString('base64');
      const accountDataQuery = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username),
        columns: {
          id: true
        }
      });
      if (!accountDataQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found'
        });
      }
      const passwordHash = await new Argon2id().hash(newPassword);
      await db
        .update(accounts)
        .set({
          passwordHash
        })
        .where(eq(accounts.id, accountDataQuery.id));
      return { newPassword };
    }),
  reset2fa: accountProcedure
    .input(
      z.object({
        username: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const accountDataQuery = await db.query.accounts.findFirst({
        where: eq(accounts.username, input.username)
      });
      if (!accountDataQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found'
        });
      }
      const newSecret = crypto.getRandomValues(new Uint8Array(20));
      await db
        .update(accounts)
        .set({ twoFactorSecret: encodeHex(newSecret), twoFactorEnabled: false })
        .where(eq(accounts.id, accountDataQuery.id));
      const uri = createTOTPKeyURI(
        'UnInbox.com',
        accountDataQuery.username,
        newSecret
      );
      return { uri };
    })
});
