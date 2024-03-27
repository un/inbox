import { z } from 'zod';
import { router, orgProcedure } from '~/trpc/trpc';
import { eq } from '@u22n/database/orm';
import { orgs } from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils';
import { isAccountAdminOfOrg } from '~/utils/account';
import { TRPCError } from '@trpc/server';

export const orgProfileRouter = router({
  getOrgProfile: orgProcedure
    .input(
      z.object({
        orgPublicId: typeIdValidator('org').optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;
      const { orgPublicId } = input;

      const orgProfileQuery = await db.query.orgs.findFirst({
        columns: {
          publicId: true,
          avatarId: true,
          name: true
        },
        where: orgPublicId ? eq(orgs.publicId, orgPublicId) : eq(orgs.id, orgId)
      });

      if (!orgProfileQuery || !orgProfileQuery.publicId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization profile not found'
        });
      }

      return {
        orgProfile: orgProfileQuery
      };
    }),

  setOrgProfile: orgProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;
      const { orgName } = input;

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db
        .update(orgs)
        .set({
          name: orgName
        })
        .where(eq(orgs.id, orgId));

      return {
        success: true
      };
    })
});
