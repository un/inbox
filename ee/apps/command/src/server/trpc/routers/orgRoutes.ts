import { orgs, type OrgMetadata } from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils/typeid';
import { router, accountProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { z } from 'zod';

export const orgRouter = router({
  getOrgData: accountProcedure
    .input(
      z.object({
        orgShortcode: z.string(),
        orgPublicId: typeIdValidator('org').optional()
      })
    )
    .query(async ({ input }) => {
      //const { config, db } = ctx;

      if (!input.orgShortcode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'must provide either org shortcode or public id'
        });
      }

      const orgDataQuery = await db.query.orgs.findFirst({
        where: eq(orgs.shortcode, input.orgShortcode),
        columns: {
          id: true,
          publicId: true,
          name: true,
          shortcode: true,
          avatarTimestamp: true,
          createdAt: true,
          metadata: true,
          ownerId: true
        }
      });

      if (!orgDataQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        });
      }

      return {
        org: orgDataQuery
      };
    }),
  addSkiffOffer: accountProcedure
    .input(
      z.object({
        orgId: z.number()
      })
    )
    .mutation(async ({ ctx, input }) => {
      //const { config, db } = ctx;

      const orgDataQuery = await db.query.orgs.findFirst({
        where: eq(orgs.id, input.orgId),
        columns: {
          id: true,
          metadata: true
        }
      });
      if (!orgDataQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        });
      }

      const newOrgMetadata: OrgMetadata = orgDataQuery.metadata ?? {};
      newOrgMetadata.bonuses = newOrgMetadata.bonuses ?? []; // Initialize bonuses as an empty array if it is undefined
      newOrgMetadata.bonuses.push({
        item: 'domain',
        awardedAt: new Date(),
        awardedByAccountId: ctx.account.id,
        awardedByName: ctx.account.username,
        bonus: {
          count: 1
        },
        bonusReason: 'Skiff offer',
        note: 'Skiff offer by Omar'
      });

      await db
        .update(orgs)
        .set({
          metadata: newOrgMetadata
        })
        .where(eq(orgs.id, input.orgId));

      return {
        orgId: input.orgId,
        orgMetadata: newOrgMetadata
      };
    })
});
