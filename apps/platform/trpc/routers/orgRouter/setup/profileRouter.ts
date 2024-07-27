import { router, orgProcedure, orgAdminProcedure } from '~platform/trpc/trpc';
import { refreshOrgShortcodeCache } from '~platform/utils/orgShortcode';
import { typeIdValidator } from '@u22n/utils/typeid';
import { orgs } from '@u22n/database/schema';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { z } from 'zod';

export const orgProfileRouter = router({
  getOrgProfile: orgProcedure
    .input(
      z.object({
        orgPublicId: typeIdValidator('org').optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const { orgPublicId } = input;

      const orgProfileQuery = await db.query.orgs.findFirst({
        columns: {
          publicId: true,
          avatarTimestamp: true,
          name: true
        },
        where: orgPublicId ? eq(orgs.publicId, orgPublicId) : eq(orgs.id, orgId)
      });

      if (!orgProfileQuery?.publicId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization profile not found'
        });
      }

      return {
        orgProfile: orgProfileQuery
      };
    }),

  setOrgProfile: orgAdminProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const { orgName } = input;

      await db
        .update(orgs)
        .set({
          name: orgName
        })
        .where(eq(orgs.id, orgId));

      await refreshOrgShortcodeCache(orgId);

      return {
        success: true
      };
    })
});
